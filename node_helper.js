const NodeHelper = require("node_helper");
const axios = require("axios");

module.exports = NodeHelper.create({
    start: function () {
        console.log("Starting node_helper for: MMM-Announce");
    },

    async summarizeDataSSML(apiKey, payload) {
        try {
            console.log("[MMM-Announce] Preparing to send SSML request...");
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
            const now = new Date();
            const dateString = now.toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
            });
            const timeString = now.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
            });

            const requestBody = {
                contents: [
                    {
                        parts: [
                            {
                                text: `
                                Summarize the following content in SSML format:

                                Current Date: ${dateString}
                                Current Time: ${timeString}

                                Data:
                                ${JSON.stringify(payload, null, 2)}
                                `,
                            },
                        ],
                    },
                ],
                generationConfig: {
                    temperature: 1,
                    topP: 0.95,
                    maxOutputTokens: 8192,
                },
            };

            console.log("[MMM-Announce] 🔄 Sending SSML request to Gemini API...");
            const response = await axios.post(url, requestBody, {
                headers: { "Content-Type": "application/json" },
            });

            console.log("[MMM-Announce] ✅ SSML API response received:", JSON.stringify(response.data, null, 2));

            const candidates = response.data.candidates || [];
            if (candidates.length > 0) {
                const generatedText = candidates[0].content.parts[0].text || "No SSML summary generated.";
                const ssmlContent = `<speak>${generatedText.replace(/\n/g, '<break time="1s"/>')}</speak>`;
                console.log("[MMM-Announce] ✅ SSML summary generated:", ssmlContent);
                return ssmlContent;
            }

            console.warn("[MMM-Announce] ⚠️ No SSML summary generated.");
            return "<speak>No SSML summary generated.</speak>";
        } catch (error) {
            console.error("[MMM-Announce] ❌ Error generating SSML summary:", error.message);
            console.error("[MMM-Announce] ❌ Full error details:", error);
            return "<speak>Unable to generate SSML summary.</speak>";
        }
    },

    async summarizeDataTEXT(apiKey, payload) {
        try {
            console.log("[MMM-Announce] Preparing to send plain text request...");
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
            const now = new Date();
            const dateString = now.toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
            });
            const timeString = now.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
            });

            const requestBody = {
                contents: [
                    {
                        parts: [
                            {
                                text: `
                                Summarize the following content in plain text:

                                Current Date: ${dateString}
                                Current Time: ${timeString}

                                Data:
                                ${JSON.stringify(payload, null, 2)}
                                `,
                            },
                        ],
                    },
                ],
                generationConfig: {
                    temperature: 1,
                    topP: 0.95,
                    maxOutputTokens: 8192,
                },
            };

            console.log("[MMM-Announce] 🔄 Sending plain text request to Gemini API...");
            const response = await axios.post(url, requestBody, {
                headers: { "Content-Type": "application/json" },
            });

            console.log("[MMM-Announce] ✅ Plain text API response received:", JSON.stringify(response.data, null, 2));

            const candidates = response.data.candidates || [];
            if (candidates.length > 0) {
                const generatedText = candidates[0].content.parts[0].text || "No plain text summary generated.";
                console.log("[MMM-Announce] ✅ Plain text summary generated:", generatedText);
                return generatedText;
            }

            console.warn("[MMM-Announce] ⚠️ No plain text summary generated.");
            return "No plain text summary generated.";
        } catch (error) {
            console.error("[MMM-Announce] ❌ Error generating plain text summary:", error.message);
            console.error("[MMM-Announce] ❌ Full error details:", error);
            return "Unable to generate plain text summary.";
        }
    },

    socketNotificationReceived: async function (notification, data) {
        if (notification === "SUDH_INFO") {
            const { payload, apiKey } = data;
            console.log("[MMM-Announce] Received SUDH_INFO payload:", JSON.stringify(payload, null, 2));

            if (!apiKey) {
                console.error("[MMM-Announce] ❌ API key is missing. Please configure it in your module settings.");
                return;
            }

            try {
                console.log("[MMM-Announce] Generating summaries using Gemini API...");
                const ssmlSummary = await this.summarizeDataSSML(apiKey, payload);
                const textSummary = await this.summarizeDataTEXT(apiKey, payload);

                const processedData = {
                    text1: ssmlSummary, // SSML summary
                    text2: textSummary, // Plain text summary
                    voiceName: "Lily", // Voice configuration
                    stream: true, // Streaming enabled
                };

                console.log("[MMM-Announce] Processed Data:", JSON.stringify(processedData, null, 2));

                // Send the processed summaries back to the main module
                this.sendSocketNotification("SUDH_INFO_PROCESSED", processedData);

                console.log("[MMM-Announce] ✅ Summaries sent back to the main module.");
            } catch (error) {
                console.error("[MMM-Announce] ❌ Error processing SUDH_INFO:", error.message);
                console.error("[MMM-Announce] ❌ Full error details:", error);
            }
        }
    },
});
