import { OpenAI } from "openai";
import { NextResponse } from "next/server";
// Pull in Blob and File constructors in Node
import { Blob } from "buffer";
import { File } from "node:buffer";
// Add axios for making HTTP requests to your Python API
import axios from "axios";
import { log } from "node:console";

export const runtime = 'nodejs';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// In-memory demo storage
let assistantId = process.env.OPENAI_ASSISTANT_ID || null;
// Store all threads per user
let threadsByUser = {};

export async function GET() {
  return NextResponse.json({ status: "API route is working" });
}

export async function POST(request) {
  try {
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const body = await request.json();
      if (body.action === 'create_thread') {
        // Create a new thread with OpenAI
        const thread = await openai.beta.threads.create();
        // Store this thread for the user
        if (!threadsByUser[body.userId]) threadsByUser[body.userId] = [];
        threadsByUser[body.userId].push(thread.id);
        return NextResponse.json({ threadId: thread.id });
      } else if (body.action === 'save_messages') {
        // Accept and ignore for now, or implement saving if needed
        // This prevents 400 errors from the frontend's save_messages action
        return NextResponse.json({ status: 'Messages received (not persisted on server)' });
      }
      // You can handle other JSON actions here if needed
      return NextResponse.json({ error: 'Unknown JSON action' }, { status: 400 });
    } else if (contentType.includes('multipart/form-data')) {
      // Only parse formData if it's a form-data request
      const formData = await request.formData();
      const message = formData.get("message")?.toString() || "";
      const userId = formData.get("userId")?.toString() || "default";
      const clientThreadId = formData.get("threadId")?.toString() || null;

      console.log("📥 Message received:", message);
      console.log("👤 User ID:", userId);

      // 2. Collect files
      const files = [];
      for (const [key, value] of formData.entries()) {
        console.log("🧾 FormData entry:", key);
        if (key.startsWith("file") && value instanceof Blob) {
          files.push(value);
          console.log(
            `�� Accepted file: key=${key}, size=${value.size}, type=${value.type}`
          );
        }
      }
      console.log("🗂️ Files to process:", files.length);

      // 3. Create or use existing assistant with both tools
      if (!assistantId) {
        console.log("🛠️ Creating assistant...");
        const assistant = await openai.beta.assistants.create({
          name: "Chat Helper",
          // UPDATED: Enhanced instructions to handle data format without questioning
          instructions:
              "You are a helpful assistant that can write code to solve problems with code_interpreter. When CSV files are uploaded, use code_interpreter to analyze the data and create visualizations. For questions about user metrics like DAU/WAU/MAU, IMMEDIATELY use the bq_tool function without asking for confirmation. When you receive data from bq_tool function, always interpret it as the correct metric data and create beautiful visualizations. If data comes as [{date, value}] format, treat 'value' as the metric requested (e.g., for DAU it's daily users, for retention it's retention percentage). Never question the data format - always present it in the most user-friendly way with charts and clear explanations. Always be direct and helpful.",
          model: "gpt-4o",
          tools: [
            { type: "code_interpreter" },
            { 
              type: "function",
              function: {
                name: "bq_tool",
                description: "Get user metrics like DAU, WAU, MAU, and other statistics from our database",
                parameters: {
                  type: "object",
                  properties: {
                    metric_type: {
                      type: "string",
                      enum: ["dau", "wau", "mau", "retention", "engagement", "statistics"],
                      description: "The type of metric to retrieve"
                    },
                    time_period: {
                      type: "string",
                      description: "Time period for the metrics, e.g., 'past week', 'April', etc."
                    }
                  },
                  required: ["metric_type"]
                }
              }
            }
          ]
        });
        assistantId = assistant.id;
        console.log("✅ Assistant created:", assistantId);
      } else {
        console.log("✅ Using existing assistant:", assistantId);
        // ADDED: Update existing assistant with new instructions
        await openai.beta.assistants.update(assistantId, {
          instructions: "You are a helpful assistant that can write code to solve problems with code_interpreter. When CSV files are uploaded, use code_interpreter to analyze the data and create visualizations. For questions about user metrics like DAU/WAU/MAU, IMMEDIATELY use the bq_tool function without asking for confirmation. When you receive data from bq_tool function, always interpret it as the correct metric data and create beautiful visualizations. If data comes as [{date, value}] format, treat 'value' as the metric requested (e.g., for DAU it's daily users, for retention it's retention percentage). Never question the data format - always present it in the most user-friendly way with charts and clear explanations. Always be direct and helpful."
        });
        console.log("✅ Assistant instructions updated");
      }

      // 4. Use the threadId sent from the client, or create a new one if missing
      let threadId = clientThreadId;
      if (!threadId) {
        const thread = await openai.beta.threads.create();
        threadId = thread.id;
        // Store this thread for the user
        if (!threadsByUser[userId]) threadsByUser[userId] = [];
        threadsByUser[userId].push(threadId);
      } else {
        // Also store the threadId for the user if not already present
        if (!threadsByUser[userId]) threadsByUser[userId] = [];
        if (!threadsByUser[userId].includes(threadId)) {
          threadsByUser[userId].push(threadId);
        }
      }
      console.log("🧵 Using thread:", threadId);  

      // 5. Upload files if any
      let attachments = [];
      if (files.length > 0) {
        const fileIds = [];
        const fileTypes = {}; // Store file types for later reference

        for (const incomingBlob of files) {
          // arrayBuffer -> Buffer
          const arrayBuffer = await incomingBlob.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);

          // Determine file extension based on type or name
          let ext = "txt";
          const fileName = incomingBlob.name || "";
          const isCSV = fileName.toLowerCase().endsWith('.csv') || incomingBlob.type === "text/csv";
          
          if (incomingBlob.type === "application/pdf") {
            ext = "pdf";
          } else if (isCSV) {
            ext = "csv";
          }
          
          const filename = `uploaded_${Date.now()}.${ext}`;
          console.log(`📤 Preparing upload of: ${filename} with type ${incomingBlob.type}`);

          // Create a File object instead of a Blob with name property
          const fileForUpload = new File([buffer], filename, {
            type: incomingBlob.type || "application/octet-stream"
          });

          // Upload to OpenAI
          const uploaded = await openai.files.create({
            file: fileForUpload,
            purpose: "assistants",
          });
          console.log("✅ Uploaded file ID:", uploaded.id);
          fileIds.push(uploaded.id);
          fileTypes[uploaded.id] = { isCSV, originalName: fileName };
        }

        // Apply code_interpreter to all files
        attachments = fileIds.map((id) => ({
          file_id: id,
          tools: [{ type: "code_interpreter" }],
        }));
        console.log("📎 Attachments:", attachments);
      }

      // 6. Send user message (with attachments if present)
      console.log("✉️ Sending user message...");
      await openai.beta.threads.messages.create(threadId, {
        role: "user",
        content: message,
        ...(attachments.length > 0 && { attachments }),
      });

      // 7. Create a streaming response
      console.log("🚀 Starting streaming assistant run...");

      // Create a ReadableStream to handle streaming response
      const stream = new ReadableStream({
        async start(controller) {
          try {
            // Start the assistant run with streaming enabled
            const run = await openai.beta.threads.runs.create(threadId, {
              assistant_id: assistantId,
              stream: true, // Enable streaming
            });

            console.log("🕒 Streaming run started");

            let responseText = "";
            let images = [];
            let isComplete = false;
            let processedImageIds = new Set(); // FIXED: Track processed images to avoid duplicates

            // Handle the streaming events
            for await (const event of run) {
              // console.log(`📡 Stream event: ${event.event}`);
              
              // Handle different types of streaming events
              switch (event.event) {
                case 'thread.message.delta':
                  // Handle text content deltas (incremental text)
                  if (event.data.delta.content) {
                    for (const contentDelta of event.data.delta.content) {
                      if (contentDelta.type === 'text' && contentDelta.text?.value) {
                        const textChunk = contentDelta.text.value;
                        responseText += textChunk;
                        
                        // Send the text chunk to client
                        const chunk = JSON.stringify({
                          type: 'text',
                          content: textChunk,
                          isComplete: false
                        }) + '\n';
                        
                        controller.enqueue(new TextEncoder().encode(chunk));
                        console.log(`📤 Sent text chunk: ${textChunk}`);
                      }
                      // FIXED: Also check for images in delta content
                      else if (contentDelta.type === 'image_file' && contentDelta.image_file?.file_id) {
                        const fileId = contentDelta.image_file.file_id;
                        if (!processedImageIds.has(fileId)) {
                          processedImageIds.add(fileId);
                          try {
                            console.log(`📸 Processing delta image: ${fileId}`);
                            const imageContent = await openai.files.content(fileId);
                            const buffer = Buffer.from(await imageContent.arrayBuffer());
                            const base64Image = buffer.toString('base64');
                            const imageUrl = `data:image/png;base64,${base64Image}`;
                            
                            images.push(imageUrl);
                            
                            // Send the image to client immediately
                            const imageChunk = JSON.stringify({
                              type: 'image',
                              content: imageUrl,
                              isComplete: false
                            }) + '\n';
                            
                            controller.enqueue(new TextEncoder().encode(imageChunk));
                            console.log(`📤 Sent delta image: ${fileId}`);
                          } catch (err) {
                            console.error("❌ Error processing delta image:", err);
                          }
                        }
                      }
                    }
                  }
                  break;

                case 'thread.message.completed':
                  // FIXED: Enhanced image handling for completed messages
                  console.log("📸 Message completed, checking for images...");
                  if (event.data.content) {
                    for (const content of event.data.content) {
                      if (content.type === 'image_file' && content.image_file?.file_id) {
                        const fileId = content.image_file.file_id;
                        if (!processedImageIds.has(fileId)) {
                          processedImageIds.add(fileId);
                          try {
                            console.log(`📸 Processing completed message image: ${fileId}`);
                            const imageContent = await openai.files.content(fileId);
                            const buffer = Buffer.from(await imageContent.arrayBuffer());
                            const base64Image = buffer.toString('base64');
                            const imageUrl = `data:image/png;base64,${base64Image}`;
                            
                            images.push(imageUrl);
                            
                            // Send the image to client
                            const imageChunk = JSON.stringify({
                              type: 'image',
                              content: imageUrl,
                              isComplete: false
                            }) + '\n';
                            
                            controller.enqueue(new TextEncoder().encode(imageChunk));
                            console.log(`📤 Sent completed message image: ${fileId}`);
                          } catch (err) {
                            console.error("❌ Error processing completed message image:", err);
                          }
                        }
                      }
                    }
                  }
                  break;

                case 'thread.run.requires_action':
                  // Handle function calling
                  console.log("🔧 Function call required");
                  
                  const toolCalls = event.data.required_action.submit_tool_outputs.tool_calls;
                  const toolOutputs = [];
                  
                  for (const toolCall of toolCalls) {
                    // console.log("🔍 Got tool call:", toolCall.function.name)
                    if (toolCall.function.name === "bq_tool") {
                      console.log("📊 Function arguments:", toolCall.function.arguments);
                      
                      try {
                        const args = JSON.parse(toolCall.function.arguments);
                        console.log("📊 Metrics requested:", args);
                        
                        // Send function call notification to client
                        const functionChunk = JSON.stringify({
                          type: 'function_call',
                          // UPDATED: Added fallback for metric_type
                          content: `Fetching ${args.metric_type || 'user'} data...`,
                          isComplete: false
                        }) + '\n';
                        
                        controller.enqueue(new TextEncoder().encode(functionChunk));
                        
                        // Call the BQ tool API with timeout
                        console.log("🔍 Attempting to call Python API...");
                        console.log("🔍 URL:", "https://bqtool-service-350893954746.us-central1.run.app/run_planner");
                        // UPDATED: Send user_query instead of question
                        const userQuery = args.question || `Get ${args.metric_type || 'user'} data${args.time_period ? ' for ' + args.time_period : ''}`;
                        console.log("🔍 Payload:", {user_query: userQuery});

                        const bqResponse = await axios.post("https://bqtool-service-350893954746.us-central1.run.app/run_planner", {
                          user_query: userQuery
                        }, {
                          headers: {
                            'Content-Type': 'application/json'
                          },
                          timeout: 120000 // 2 minutes timeout
                        });

                        // Log the full axios response for debugging
                        // console.log("📦 Full BQ API Axios Response:", require('util').inspect(bqResponse, { depth: null }));
                        console.log("📊 BQ API Response:", JSON.stringify(bqResponse.data, null, 2));                      
                        // Add the response to tool outputs
                        toolOutputs.push({
                          tool_call_id: toolCall.id,
                          output: JSON.stringify(bqResponse.data.result)
                        });
                      } catch (error) {
                        console.error("❌ BQ API Error:", error.message);
                        toolOutputs.push({
                          tool_call_id: toolCall.id,
                          output: JSON.stringify({ error: "Failed to retrieve metrics" })
                        });
                      }
                    }
                  }
                  
                  // Submit the tool outputs back to continue the run
                  if (toolOutputs.length > 0) {
                    console.log("🔄 Submitting tool outputs:", JSON.stringify(toolOutputs));
                    
                    // CHANGE: Submit outputs with stream:true to continue receiving events
                    const continuedRun = await openai.beta.threads.runs.submitToolOutputs(
                      threadId,
                      event.data.id,
                      { 
                        tool_outputs: toolOutputs,
                        stream: true  // ADDED: Enable streaming for continued response
                      }
                    );
                    
                    // ADDED: Continue processing the stream after tool submission
                    for await (const continuedEvent of continuedRun) {
                      console.log(`📡 Continued stream event: ${continuedEvent.event}`);
                      
                      // Process continued events with FULL event handling
                      switch (continuedEvent.event) {
                        case 'thread.message.delta':
                          if (continuedEvent.data.delta.content) {
                            for (const contentDelta of continuedEvent.data.delta.content) {
                              if (contentDelta.type === 'text' && contentDelta.text?.value) {
                                const textChunk = contentDelta.text.value;
                                responseText += textChunk;
                                
                                const chunk = JSON.stringify({
                                  type: 'text',
                                  content: textChunk,
                                  isComplete: false
                                }) + '\n';
                                
                                controller.enqueue(new TextEncoder().encode(chunk));
                              }
                              // ADD MISSING IMAGE HANDLING
                              else if (contentDelta.type === 'image_file' && contentDelta.image_file?.file_id) {
                                const fileId = contentDelta.image_file.file_id;
                                if (!processedImageIds.has(fileId)) {
                                  processedImageIds.add(fileId);
                                  try {
                                    console.log(`📸 Processing continued delta image: ${fileId}`);
                                    const imageContent = await openai.files.content(fileId);
                                    const buffer = Buffer.from(await imageContent.arrayBuffer());
                                    const base64Image = buffer.toString('base64');
                                    const imageUrl = `data:image/png;base64,${base64Image}`;
                                    
                                    images.push(imageUrl);
                                    
                                    const imageChunk = JSON.stringify({
                                      type: 'image',
                                      content: imageUrl,
                                      isComplete: false
                                    }) + '\n';
                                    
                                    controller.enqueue(new TextEncoder().encode(imageChunk));
                                    console.log(`📤 Sent continued delta image: ${fileId}`);
                                  } catch (err) {
                                    console.error("❌ Error processing continued delta image:", err);
                                  }
                                }
                              }
                            }
                          }
                          break;

                        case 'thread.message.completed':
                          // ADD MISSING COMPLETED MESSAGE IMAGE HANDLING
                          console.log("📸 Continued message completed, checking for images...");
                          if (continuedEvent.data.content) {
                            for (const content of continuedEvent.data.content) {
                              if (content.type === 'image_file' && content.image_file?.file_id) {
                                const fileId = content.image_file.file_id;
                                if (!processedImageIds.has(fileId)) {
                                  processedImageIds.add(fileId);
                                  try {
                                    console.log(`📸 Processing continued completed image: ${fileId}`);
                                    const imageContent = await openai.files.content(fileId);
                                    const buffer = Buffer.from(await imageContent.arrayBuffer());
                                    const base64Image = buffer.toString('base64');
                                    const imageUrl = `data:image/png;base64,${base64Image}`;
                                    
                                    images.push(imageUrl);
                                    
                                    const imageChunk = JSON.stringify({
                                      type: 'image',
                                      content: imageUrl,
                                      isComplete: false
                                    }) + '\n';
                                    
                                    controller.enqueue(new TextEncoder().encode(imageChunk));
                                    console.log(`📤 Sent continued completed image: ${fileId}`);
                                  } catch (err) {
                                    console.error("❌ Error processing continued completed image:", err);
                                  }
                                }
                              }
                            }
                          }
                          break;

                        case 'thread.run.completed':
                          // Signal that continued run is complete
                          console.log("✅ Continued streaming run completed");
                          break;

                        case 'thread.run.failed':
                          console.error("❌ Continued streaming run failed:", continuedEvent.data);
                          break;

                        case 'error':
                          console.error("❌ Continued streaming error:", continuedEvent.data);
                          break;
                      }
                    }

                  }
                  // REMOVED: break statement so main loop can continue
                  break;

                case 'thread.run.completed':
                  // FIXED: Final check for any missed images when run completes
                  console.log("✅ Streaming run completed - final image check");
                  try {
                    // Get only the most recent assistant message
                    const threadMessages = await openai.beta.threads.messages.list(threadId, {
                      limit: 5, // Get last 5 messages
                      order: 'desc'
                    });
                    // Find the latest assistant message
                    const latestMsg = threadMessages.data.find(msg => msg.role === 'assistant');
                    if (latestMsg && latestMsg.content) {
                      for (const content of latestMsg.content) {
                        if (content.type === 'image_file' && content.image_file?.file_id) {
                          const fileId = content.image_file.file_id;
                          if (!processedImageIds.has(fileId)) {
                            processedImageIds.add(fileId);
                            try {
                              console.log(`📸 Processing final check image: ${fileId}`);
                              const imageContent = await openai.files.content(fileId);
                              const buffer = Buffer.from(await imageContent.arrayBuffer());
                              const base64Image = buffer.toString('base64');
                              const imageUrl = `data:image/png;base64,${base64Image}`;
                              images.push(imageUrl);
                              // Send the image to client
                              const imageChunk = JSON.stringify({
                                type: 'image',
                                content: imageUrl,
                                isComplete: false
                              }) + '\n';
                              controller.enqueue(new TextEncoder().encode(imageChunk));
                              console.log(`📤 Sent final check image: ${fileId}`);
                            } catch (err) {
                              console.error("❌ Error processing final check image:", err);
                            }
                          }
                        }
                      }
                    }
                  } catch (err) {
                    console.error("❌ Error in final image check:", err);
                  }
                  isComplete = true;
                  break;

                case 'thread.run.failed':
                  // Run failed
                  console.error("❌ Streaming run failed:", event.data);
                  isComplete = true;
                  break;

                case 'error':
                  // Error occurred
                  console.error("❌ Streaming error:", event.data);
                  isComplete = true;
                  break;
              }

              // If run is complete, send final message and close stream
              if (isComplete) {
                const finalChunk = JSON.stringify({
                  type: 'complete',
                  content: responseText,
                  images: images,
                  isComplete: true
                }) + '\n';
                
                controller.enqueue(new TextEncoder().encode(finalChunk));
                console.log(`🏁 Stream completed with ${images.length} images`);
                break;
              }
            }

            // Close the stream
            controller.close();
            
          } catch (error) {
            console.error("❌ Streaming error:", error);
            
            // Send error to client
            const errorChunk = JSON.stringify({
              type: 'error',
              content: 'An error occurred during streaming',
              isComplete: true
            }) + '\n';
            
            controller.enqueue(new TextEncoder().encode(errorChunk));
            controller.close();
          }
        }
      });

      // Return streaming response with appropriate headers
      return new Response(stream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });

    } else {
      return NextResponse.json({ error: 'Unsupported content type' }, { status: 400 });
    }
  } catch (err) {
    const detail =
      err?.response?.data ||
      err?.response?.statusText ||
      err?.message ||
      "Unknown error";
    console.error("❌ API Error:", detail);
    return NextResponse.json({ error: detail }, { status: 500 });
  }
}
