// Embed script - creates the chat widget iframe
(() => {
	// Type for the config object
	interface velaConfig {
		url?: string;
		agentId?: string;
		apiUrl?: string;
		theme?: "light" | "dark";
		primaryColor?: string;
		chatBubbleColor?: string;
		displayName?: string;
		profilePicture?: string | null;
		initialMessage?: string | null;
		suggestedMessages?: string[];
		messagePlaceholder?: string | null;
		footerMessage?: string | null;
		dismissibleMessage?: string | null;
		welcomeBubbles?: string[];
	}

	// Read config from window.__vela_config (set by user before loading this script)
	const userConfig = (window as unknown as { __vela_config?: velaConfig }).__vela_config || {};

	// Build final config with defaults
	const config: Required<Omit<velaConfig, "url">> & { url: string } = {
		url: userConfig.url || "http://localhost:3002",
		agentId: userConfig.agentId || "",
		apiUrl: userConfig.apiUrl || "http://localhost:3001",
		theme: userConfig.theme || "light",
		primaryColor: userConfig.primaryColor || "#3b82f6",
		chatBubbleColor: userConfig.chatBubbleColor || "#3b82f6",
		displayName: userConfig.displayName || "Assistant",
		profilePicture: userConfig.profilePicture ?? null,
		initialMessage: userConfig.initialMessage ?? null,
		suggestedMessages: userConfig.suggestedMessages || [],
		messagePlaceholder: userConfig.messagePlaceholder ?? null,
		footerMessage: userConfig.footerMessage ?? null,
		dismissibleMessage: userConfig.dismissibleMessage ?? null,
		welcomeBubbles: userConfig.welcomeBubbles || [],
	};

	// Build iframe URL with config in hash (avoids server round-trip)
	const configHash = encodeURIComponent(JSON.stringify(config));
	const WIDGET_URL = `${config.url}#config=${configHash}`;

	// Prevent multiple initializations
	if ((window as unknown as { __vela_initialized?: boolean }).__vela_initialized) {
		return;
	}
	(window as unknown as { __vela_initialized?: boolean }).__vela_initialized = true;

	function init() {
		// Create widget container
		const container = document.createElement("div");
		container.id = "vela-widget-container";
		container.style.cssText = `
			position: fixed;
			bottom: 20px;
			right: 20px;
			z-index: 999999;
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
		`;
		document.body.appendChild(container);

		// Create toggle button
		const button = document.createElement("button");
		button.id = "vela-toggle";
		button.innerHTML = `
			<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
			</svg>
		`;
		button.style.cssText = `
			width: 56px;
			height: 56px;
			border-radius: 50%;
			background: ${config.primaryColor};
			border: none;
			cursor: pointer;
			display: flex;
			align-items: center;
			justify-content: center;
			color: white;
			box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
			transition: transform 0.2s, box-shadow 0.2s;
		`;
		button.onmouseenter = () => {
			button.style.transform = "scale(1.05)";
			button.style.boxShadow = "0 6px 16px rgba(0, 0, 0, 0.2)";
		};
		button.onmouseleave = () => {
			button.style.transform = "scale(1)";
			button.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.15)";
		};
		container.appendChild(button);

		// Create welcome bubbles container (shown above the chat icon)
		let welcomeBubblesContainer: HTMLDivElement | null = null;
		const welcomeBubbles = config.welcomeBubbles || [];
		if (welcomeBubbles.length > 0) {
			welcomeBubblesContainer = document.createElement("div");
			welcomeBubblesContainer.id = "vela-welcome-bubbles";
			welcomeBubblesContainer.style.cssText = `
				position: absolute;
				bottom: 70px;
				right: 0;
				display: flex;
				flex-direction: column;
				gap: 8px;
				align-items: flex-end;
			`;

			// Add animation keyframes
			const style = document.createElement("style");
			style.textContent = `
				@keyframes vela-bubble-appear {
					from {
						opacity: 0;
						transform: translateY(10px) scale(0.95);
					}
					to {
						opacity: 1;
						transform: translateY(0) scale(1);
					}
				}
			`;
			document.head.appendChild(style);

			welcomeBubbles.forEach((msg, idx) => {
				const bubble = document.createElement("div");
				bubble.className = "vela-welcome-bubble";
				bubble.innerHTML = `<span style="flex: 1;">${msg}</span>`;
				bubble.style.cssText = `
					background: white;
					color: #333;
					padding: 12px 16px;
					border-radius: 12px;
					box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
					max-width: 250px;
					font-size: 14px;
					line-height: 1.4;
					display: flex;
					align-items: flex-start;
					cursor: pointer;
					animation: vela-bubble-appear 0.3s ease-out;
					animation-delay: ${idx * 0.1}s;
					animation-fill-mode: backwards;
				`;
				bubble.addEventListener("click", () => {
					if (welcomeBubblesContainer) {
						welcomeBubblesContainer.style.display = "none";
					}
					button.click();
				});
				welcomeBubblesContainer!.appendChild(bubble);
			});

			// Add close button to container
			const closeBtn = document.createElement("button");
			closeBtn.id = "vela-welcome-close";
			closeBtn.innerHTML = "&times;";
			closeBtn.style.cssText = `
				position: absolute;
				top: -8px;
				right: -8px;
				background: white;
				border: none;
				cursor: pointer;
				width: 24px;
				height: 24px;
				border-radius: 50%;
				box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
				font-size: 16px;
				line-height: 1;
				color: #666;
			`;
			closeBtn.addEventListener("click", (e) => {
				e.stopPropagation();
				if (welcomeBubblesContainer) {
					welcomeBubblesContainer.style.display = "none";
				}
			});
			welcomeBubblesContainer.appendChild(closeBtn);

			container.appendChild(welcomeBubblesContainer);
		}

		// Create iframe container (hidden by default)
		const iframeContainer = document.createElement("div");
		iframeContainer.id = "vela-iframe-container";
		iframeContainer.style.cssText = `
			position: absolute;
			bottom: 70px;
			right: 0;
			width: 380px;
			height: 600px;
			max-height: calc(100vh - 100px);
			border-radius: 12px;
			overflow: hidden;
			box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
			display: none;
			background: white;
		`;
		container.appendChild(iframeContainer);

		// Iframe will be created lazily on first open
		let iframe: HTMLIFrameElement | null = null;
		let iframeLoaded = false;

		function createIframe() {
			if (iframe) return;
			iframe = document.createElement("iframe");
			iframe.id = "vela-iframe";
			iframe.src = WIDGET_URL;
			iframe.style.cssText = `
				width: 100%;
				height: 100%;
				border: none;
			`;
			iframe.allow = "microphone";
			iframeContainer.appendChild(iframe);
			iframeLoaded = true;
		}

		// Toggle functionality
		let isOpen = false;
		button.onclick = () => {
			isOpen = !isOpen;
			// Hide welcome bubbles when opening chat
			if (isOpen && welcomeBubblesContainer) {
				welcomeBubblesContainer.style.display = "none";
			}
			// Lazy load iframe on first open
			if (isOpen && !iframeLoaded) {
				createIframe();
			}
			iframeContainer.style.display = isOpen ? "block" : "none";
			button.innerHTML = isOpen
				? `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<line x1="18" y1="6" x2="6" y2="18"></line>
						<line x1="6" y1="6" x2="18" y2="18"></line>
					</svg>`
				: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
					</svg>`;
		};

		// Listen for messages from iframe
		window.addEventListener("message", (event) => {
			if (event.origin !== new URL(WIDGET_URL).origin) return;

			const { type, data } = event.data || {};

			if (type === "vela:close") {
				isOpen = false;
				iframeContainer.style.display = "none";
				button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
				</svg>`;
			}

			if (type === "vela:resize" && data?.height) {
				iframeContainer.style.height = `${Math.min(data.height, window.innerHeight - 100)}px`;
			}

			if (type === "vela:style" && data) {
				if (data.primaryColor) {
					button.style.background = data.primaryColor;
				}
			}
		});

		// Expose API
		(window as unknown as { vela: unknown }).vela = {
			open: () => {
				isOpen = true;
				// Lazy load iframe on first open
				if (!iframeLoaded) {
					createIframe();
				}
				iframeContainer.style.display = "block";
				button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<line x1="18" y1="6" x2="6" y2="18"></line>
					<line x1="6" y1="6" x2="18" y2="18"></line>
				</svg>`;
			},
			close: () => {
				isOpen = false;
				iframeContainer.style.display = "none";
				button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
				</svg>`;
			},
			toggle: () => {
				button.click();
			},
			isOpen: () => isOpen,
		};
	}

	// Wait for DOM to be ready before initializing
	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", init);
	} else {
		// DOM is already ready
		init();
	}
})();
