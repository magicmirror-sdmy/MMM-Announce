Module.register("MMM-Announce", {
    defaults: {
        apiKey: "" // Default API key placeholder
    },

    start: function () {
        Log.info("[MMM-Announce] Starting module: MMM-Announce");

        // Ensure the API key is configured
        if (!this.config.apiKey) {
            Log.error("[MMM-Announce] Error: API key is not configured. Please add it to the module configuration.");
        }

        // Initialize cached summaries
        this.cachedSSML = null;
        this.cachedText = null;
        this.clearTextTimeout = null;

        Log.info("[MMM-Announce] Module initialized.");
    },

    notificationReceived: function (notification, payload, sender) {
        Log.info(`[MMM-Announce] Notification received: ${notification}`);

        if (notification === "SUDH_INFO") {
            Log.info("[MMM-Announce] Received SUDH_INFO. Forwarding payload to node_helper for summarization.");

            // Send the payload and API key to node_helper for processing
            this.sendSocketNotification("SUDH_INFO", {
                payload: payload,
                apiKey: this.config.apiKey
            });
        }

        if (notification === "SSML_FAILED") {
            Log.warn("[MMM-Announce] SSML_FAILED received. Preparing to send TTS_SAY notification.");

            if (!this.cachedText) {
                Log.error("[MMM-Announce] Error: No cached text available. Cannot send TTS_SAY notification.");
                return;
            }

            Log.info(`[MMM-Announce] Sending TTS_SAY with payload: ${this.cachedText}`);
            this.sendNotification("TTS_SAY", {
                content: this.cachedText,  // Use the cached plain text summary
                type: "text",
                voiceName: "en-GB-Journey-F",
                languageCode: "en-GB",
                ssmlGender: "FEMALE"
            });

            // Immediately clear cachedText after TTS_SAY is fired
            this.cachedText = null;

            // Cancel the timeout since cachedText is cleared
            if (this.clearTextTimeout) {
                clearTimeout(this.clearTextTimeout);
                this.clearTextTimeout = null;
            }
        }
    },

    socketNotificationReceived: function (notification, payload) {
        Log.info(`[MMM-Announce] Socket notification received: ${notification}`);

        if (notification === "SUDH_INFO_PROCESSED") {
            Log.info("[MMM-Announce] Received SUDH_INFO_PROCESSED. Processing the summarization results.");
            Log.debug(`[MMM-Announce] Processed payload: ${JSON.stringify(payload, null, 2)}`);

            // Cache the SSML and text summaries
            this.cachedSSML = payload.text1 || null; // SSML summary
            this.cachedText = payload.text2 || null; // Plain text summary

            if (!this.cachedSSML) {
                Log.error("[MMM-Announce] Error: No SSML summary available. Sending SSML_FAILED notification.");
                this.sendNotification("SSML_FAILED");
                return;
            }

            Log.info("[MMM-Announce] Broadcasting SSML notification globally with additional parameters.");
            this.sendNotification("SSML", {
                text: this.cachedSSML, // SSML summary as text
                voiceName: payload.voiceName || "Charlotte",
                stream: payload.stream || true
            });

            // Immediately clear cachedSSML after sending SSML notification
            this.cachedSSML = null;

            // Start the timeout to clear cachedText in case SSML_FAILED is not received
            this.startClearTextTimeout();
        }
    },

    startClearTextTimeout: function () {
        // Clear any existing timeout
        if (this.clearTextTimeout) {
            clearTimeout(this.clearTextTimeout);
        }

        // Start a new 5-minute timeout to clear cachedText
        this.clearTextTimeout = setTimeout(() => {
            Log.info("[MMM-Announce] 5 minutes passed without SSML_FAILED or TTS_SAY. Clearing cachedText.");
            this.cachedText = null;
        }, 5 * 60 * 1000); // 5 minutes
    }
});
