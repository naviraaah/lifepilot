const fs = require("fs");
const path = require("path");

/**
 * Search dentists from the directory
 */
function searchDentists(dentists, location, timeWindow) {
  console.log("[scheduleDentist] Searching dentists with filters:", {
    location,
    timeWindow,
  });

  let filtered = dentists;

  // Filter by location if specified
  if (location) {
    const locationLower = location.toLowerCase();
    // More flexible location matching - check for common location terms
    const locationTerms = locationLower
      .split(/[\s,]+/)
      .filter((term) => term.length > 2);

    console.log("[scheduleDentist] Location terms extracted:", locationTerms);
    console.log(
      "[scheduleDentist] Dentists before location filter:",
      filtered.length
    );

    filtered = filtered.filter((d) => {
      const addressLower = d.address.toLowerCase();
      const practiceLower = d.practice.toLowerCase();

      // Check if any location term matches
      const matches = locationTerms.some(
        (term) =>
          addressLower.includes(term) ||
          practiceLower.includes(term) ||
          // Also check for common location aliases
          (term === "soma" &&
            (addressLower.includes("south of market") ||
              addressLower.includes("soma"))) ||
          (term === "sf" && addressLower.includes("san francisco")) ||
          (term === "san" && addressLower.includes("san francisco"))
      );

      if (!matches) {
        console.log(
          `[scheduleDentist] Dentist ${d.name} (${d.address}) did not match location terms`
        );
      }

      return matches;
    });

    console.log(
      "[scheduleDentist] Dentists after location filter:",
      filtered.length
    );
  }

  // Filter by time window if specified
  if (timeWindow) {
    const timeWindowLower = timeWindow.toLowerCase();
    // Extract time-related keywords from the time window
    const isMorning =
      timeWindowLower.includes("morning") ||
      timeWindowLower.includes("before 12") ||
      timeWindowLower.includes("before noon") ||
      timeWindowLower.includes("am");
    const isAfternoon =
      timeWindowLower.includes("afternoon") ||
      timeWindowLower.includes("after 12") ||
      timeWindowLower.includes("after noon") ||
      timeWindowLower.includes("pm");
    const isEvening =
      timeWindowLower.includes("evening") ||
      timeWindowLower.includes("after 5") ||
      timeWindowLower.includes("after 6");

    console.log("[scheduleDentist] Time window analysis:", {
      timeWindow: timeWindowLower,
      isMorning,
      isAfternoon,
      isEvening,
    });
    console.log(
      "[scheduleDentist] Dentists before time filter:",
      filtered.length
    );

    // This is a simplified filter - in production, you'd parse dates/times more carefully
    filtered = filtered.filter((d) => {
      if (!d.availability || d.availability.length === 0) return true;

      // If no specific time keywords, don't filter by time
      if (!isMorning && !isAfternoon && !isEvening) {
        return true;
      }

      // Check if any availability matches the time preference
      const matches = d.availability.some((slot) => {
        const slotLower = slot.toLowerCase();

        // For morning: look for slots that start early (8, 9, 10) or have morning hours
        if (isMorning) {
          return /[89]|10|11/.test(slotLower) || slotLower.includes("morning");
        }

        // For afternoon: look for slots that include afternoon hours
        if (isAfternoon) {
          return /12|1[2-5]|afternoon/.test(slotLower);
        }

        // For evening: look for slots that go late (after 5pm)
        if (isEvening) {
          return /1[7-9]|2[0-3]|evening|after 5/.test(slotLower);
        }

        return true;
      });

      if (!matches) {
        console.log(
          `[scheduleDentist] Dentist ${d.name} (${d.availability.join(
            ", "
          )}) did not match time window`
        );
      }

      return matches;
    });

    console.log(
      "[scheduleDentist] Dentists after time filter:",
      filtered.length
    );
  }

  return filtered;
}

/**
 * Book a dentist appointment slot
 */
function bookDentistSlot(dentistId, dentists, date, time) {
  console.log("[scheduleDentist] Booking slot:", { dentistId, date, time });

  const dentist = dentists.find((d) => d.id === dentistId);
  if (!dentist) {
    throw new Error(`Dentist with ID ${dentistId} not found`);
  }

  // In a real implementation, this would:
  // 1. Check actual availability via API
  // 2. Reserve the slot
  // 3. Create booking record

  return {
    confirmationId: `APPT-${Date.now()}-${dentistId}`,
    dentist: dentist,
    date: date,
    time: time,
    status: "confirmed",
  };
}

async function scheduleDentist(input, openai) {
  console.log("[scheduleDentist] Called with input:", input);

  // Load available dentists
  const dentistsPath = path.join(__dirname, "../data/dentists.json");
  const dentists = JSON.parse(fs.readFileSync(dentistsPath, "utf8"));

  try {
    // Normalize input - always use string format for location extraction
    const userInput =
      typeof input === "string"
        ? input
        : `I need to schedule a dentist appointment. ${
            input.preferredDate ? `Preferred date: ${input.preferredDate}.` : ""
          } ${
            input.preferredTime ? `Preferred time: ${input.preferredTime}.` : ""
          } ${input.reason ? `Reason: ${input.reason}.` : ""}`;

    // Use the new LifePilot prompt for autonomous dentist booking
    const systemPrompt = `You are LifePilot — the user's AI pilot for the boring operations of everyday life.
Your job is to autonomously schedule a dentist appointment for the user using multi-step reasoning and real tool execution.

GOAL:
Given the user request, find a dentist near the target location, filter available times, select the best slot, fill the booking form, confirm the appointment, and deliver a final summary.

WORKFLOW STEPS:
1. Parse the user's natural language request.
2. Identify the required constraints: location, date/time preference.
3. Search the dentist provider directory (via tool: search_dentists).
4. Filter the results based on:
   - user location requirement
   - time window
   - next available slots
5. Select the best provider using:
   - earliest time that matches all constraints
   - highest rating (if available)
6. Fill the appointment booking form (tool: book_dentist_slot).
7. Confirm the booking and retrieve confirmation details.
8. Return a clean summary to the user including:
   - provider name
   - appointment time
   - address
   - confirmation ID

AGENT RULES:
- Never ask the user to click anything.
- Don't require user to choose between options — make the decision automatically.
- If tool results are incomplete, make your best inference.
- Always think step-by-step before selecting tools.
- IMPORTANT: Extract location from the user's request (e.g., "SoMa", "San Francisco", "downtown", "near Market St")

Available dentists: ${JSON.stringify(dentists, null, 2)}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userInput,
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "search_dentists",
            description:
              "Search the dentist provider directory with location and time window filters",
            parameters: {
              type: "object",
              properties: {
                location: {
                  type: "string",
                  description:
                    'Location preference (e.g., "SoMa", "San Francisco", "near downtown")',
                },
                timeWindow: {
                  type: "string",
                  description:
                    'Time window preference (e.g., "after 5pm", "morning", "next week")',
                },
              },
            },
          },
        },
        {
          type: "function",
          function: {
            name: "book_dentist_slot",
            description: "Book a specific dentist appointment slot",
            parameters: {
              type: "object",
              properties: {
                dentistId: {
                  type: "number",
                  description: "ID of the selected dentist",
                },
                date: {
                  type: "string",
                  description:
                    'Appointment date (e.g., "2025-11-25", "next Tuesday")',
                },
                time: {
                  type: "string",
                  description:
                    'Appointment time (e.g., "5:00 PM", "morning", "afternoon")',
                },
              },
              required: ["dentistId", "date", "time"],
            },
          },
        },
      ],
      tool_choice: "auto",
      temperature: 0.3, // Lower temperature for more deterministic booking decisions
    });

    const message = response.choices[0].message;

    // Handle tool calls
    if (message.tool_calls && message.tool_calls.length > 0) {
      const toolCall = message.tool_calls[0];
      const functionName = toolCall.function.name;
      const functionArgs = JSON.parse(toolCall.function.arguments);

      let toolResult;

      if (functionName === "search_dentists") {
        toolResult = searchDentists(
          dentists,
          functionArgs.location,
          functionArgs.timeWindow
        );
        console.log(
          `[scheduleDentist] Found ${toolResult.length} matching dentists`
        );
      } else if (functionName === "book_dentist_slot") {
        toolResult = bookDentistSlot(
          functionArgs.dentistId,
          dentists,
          functionArgs.date,
          functionArgs.time
        );
        console.log(
          "[scheduleDentist] Booking confirmed:",
          toolResult.confirmationId
        );
      }

      // Continue the conversation with tool results
      const secondResponse = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: userInput,
          },
          message,
          {
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify(toolResult),
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "search_dentists",
              description:
                "Search the dentist provider directory with location and time window filters",
              parameters: {
                type: "object",
                properties: {
                  location: {
                    type: "string",
                    description:
                      'Location preference (e.g., "SoMa", "San Francisco", "near downtown")',
                  },
                  timeWindow: {
                    type: "string",
                    description:
                      'Time window preference (e.g., "after 5pm", "morning", "next week")',
                  },
                },
              },
            },
          },
          {
            type: "function",
            function: {
              name: "book_dentist_slot",
              description: "Book a specific dentist appointment slot",
              parameters: {
                type: "object",
                properties: {
                  dentistId: {
                    type: "number",
                    description: "ID of the selected dentist",
                  },
                  date: {
                    type: "string",
                    description:
                      'Appointment date (e.g., "2025-11-25", "next Tuesday")',
                  },
                  time: {
                    type: "string",
                    description:
                      'Appointment time (e.g., "5:00 PM", "morning", "afternoon")',
                  },
                },
                required: ["dentistId", "date", "time"],
              },
            },
          },
        ],
        tool_choice: "auto",
        temperature: 0.3,
      });

      const finalMessage = secondResponse.choices[0].message;

      // If there are more tool calls (e.g., booking after searching), handle them
      if (finalMessage.tool_calls && finalMessage.tool_calls.length > 0) {
        const bookingCall = finalMessage.tool_calls.find(
          (tc) => tc.function.name === "book_dentist_slot"
        );
        if (bookingCall) {
          const bookingArgs = JSON.parse(bookingCall.function.arguments);
          const bookingResult = bookDentistSlot(
            bookingArgs.dentistId,
            dentists,
            bookingArgs.date,
            bookingArgs.time
          );

          // Get final summary
          const summaryResponse = await openai.chat.completions.create({
            model: "gpt-4-turbo-preview",
            messages: [
              {
                role: "system",
                content: systemPrompt,
              },
              {
                role: "user",
                content: userInput,
              },
              message,
              {
                role: "tool",
                tool_call_id: toolCall.id,
                content: JSON.stringify(toolResult),
              },
              finalMessage,
              {
                role: "tool",
                tool_call_id: bookingCall.id,
                content: JSON.stringify(bookingResult),
              },
            ],
            temperature: 0.3,
          });

          const summary = summaryResponse.choices[0].message.content;

          return {
            success: true,
            message: summary,
            appointment: bookingResult,
            summary: summary,
          };
        }
      }

      // Return the response with search results
      return {
        success: true,
        message: finalMessage.content || "Dentist search completed",
        dentists: toolResult,
        summary: finalMessage.content,
      };
    }

    // If no tool calls, return the direct response
    return {
      success: true,
      message: message.content || "Processing appointment request",
      summary: message.content,
    };
  } catch (error) {
    console.error("[scheduleDentist] Error scheduling dentist:", error);
    return {
      success: false,
      message: "Failed to schedule appointment",
      error: error.message,
    };
  }
}

module.exports = scheduleDentist;
