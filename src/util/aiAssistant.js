import { io } from "../config/socket.js";
import fs from "fs";
import OpenAI from "openai";
import { config } from "dotenv";
config();
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handleUserMessage(userId, query) {
  try {
    const messages = [
      {
        role: "assistant",
        content:
          "You are a financial assistant that help to improve Canadian credit report. you are assistant at scorewise. do not give answer of general questions. please give with beautify.",
      },
      { role: "user", content: query },
    ];
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      tools: [
        {
          type: "function",
          function: {
            name: "faqAnswer",
            description: "Finds the most relevant FAQ and returns an answer",
            parameters: {
              type: "object",
              properties: {
                userQuestion: {
                  type: "string",
                  description: "The user's question",
                },
              },
              required: ["userQuestion"],
            },
          },
        },
      ],
    });

    // Did the model request to call a tool?
    const responseMessage = completion.choices[0].message;
    if (responseMessage.tool_calls) {
      for (const toolCall of responseMessage.tool_calls) {
        if (toolCall.function.name === "faqAnswer") {
          // Here you wire up your existing FAQ function
          const args = JSON.parse(toolCall.function.arguments);
          const faqs = JSON.parse(
            fs.readFileSync("faqs_with_embeddings.json", "utf8")
          );
          const answer = await findBestFaq(args.userQuestion, faqs);
          // Return tool response back to model
          const followup = await client.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              ...messages,
              responseMessage,
              {
                role: "tool",
                tool_call_id: toolCall.id,
                content: JSON.stringify({ answer }),
              },
            ],
          });
          console.log(
            "followup.choices[0].message.content",
            followup.choices[0].message.content
          );
          const finalResponse = followup.choices[0].message.content;
          io.to(userId).emit("message", finalResponse);
          return finalResponse;
        }
      }
    }

    io.to(userId).emit("message", responseMessage.content);
    return responseMessage.content;
  } catch (err) {
    console.log(err);

    console.error("OpenAI error:", err.message);
    // return "Sorry, I’m having trouble right now 😔.";
  }
}

function cosineSimilarity(a, b) {
  const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const normA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const normB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dot / (normA * normB);
}

// --- robust findBestFaq ---
async function findBestFaq(userQuestion, faqs) {
  const list = assertArrayOfFaqs(faqs);

  const embeddingResponse = await client.embeddings.create({
    model: "text-embedding-3-small",
    input: userQuestion,
  });
  const queryEmbedding = embeddingResponse.data[0].embedding;

  let best = null;
  let bestSim = -Infinity;

  for (const item of list) {
    if (!item?.embedding || !Array.isArray(item.embedding)) continue; // skip un-embedded
    const sim = cosineSimilarity(queryEmbedding, item.embedding);
    if (sim > bestSim) {
      bestSim = sim;
      best = item;
    }
  }

  if (!best) {
    throw new Error(
      "No FAQs have embeddings. Run embedFaqs() first or add embeddings."
    );
  }

  return best; // { question, answer, embedding }
}

// --- helpers ---
function normalizeFaqs(raw) {
  // Accepts: Array, { faqs: [...] }, or stringified JSON of either
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      return normalizeFaqs(JSON.parse(raw));
    } catch {
      return [];
    }
  }
  if (Array.isArray(raw.faqs)) return raw.faqs;
  return [];
}

function assertArrayOfFaqs(faqs) {
  const list = normalizeFaqs(faqs);
  if (!Array.isArray(list) || list.length === 0) {
    throw new Error(
      "FAQ list is empty or not an array. Check your JSON shape."
    );
  }
  return list;
}
