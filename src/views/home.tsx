interface ParamConfig {
  name: string
  type: 'path' | 'query' | 'header'
  placeholder?: string
  defaultValue?: string
}

interface EndpointConfig {
  title: string
  method: string
  path: string
  description: string
  params: ParamConfig[]
}

const endpoints: EndpointConfig[] = [
  {
    title: 'Create Workflow',
    method: 'GET',
    path: '/workflow',
    description: 'Trigger a new menu fetch workflow.',
    params: [{ name: 'X-API-Key', type: 'header', placeholder: 'Your API Key' }],
  },
  {
    title: 'Workflow Status',
    method: 'GET',
    path: '/workflow/:id',
    description: 'Check the status of a specific workflow.',
    params: [{ name: 'id', type: 'path', placeholder: 'e.g., 12345' }],
  },
  {
    title: 'Menu Usage',
    method: 'GET',
    path: '/menu',
    description: 'Get usage examples and error info.',
    params: [],
  },
  {
    title: 'Query Menu',
    method: 'GET',
    path: '/menu/query/:location/:date',
    description: 'Get menu items for a specific location and date.',
    params: [
      { name: 'location', type: 'path', defaultValue: 'london', placeholder: 'london, dublin, sf' },
      { name: 'date', type: 'path', defaultValue: new Date().toISOString().split('T')[0] },
      { name: 'meal', type: 'query', placeholder: 'lunch | breakfast' },
    ],
  },
  {
    title: 'Search Menu',
    method: 'GET',
    path: '/menu/search/:location',
    description: 'Search for menu items with filters.',
    params: [
      { name: 'location', type: 'path', defaultValue: 'london', placeholder: 'london, dublin, sf' },
      { name: 'q', type: 'query', placeholder: 'Search term (e.g. vegan)' },
      { name: 'startDate', type: 'query', placeholder: 'YYYY-MM-DD' },
      { name: 'endDate', type: 'query', placeholder: 'YYYY-MM-DD' },
      { name: 'meal', type: 'query', placeholder: 'lunch | breakfast' },
      { name: 'dietary', type: 'query', placeholder: 'Dietary label' },
    ],
  },
  {
    title: 'Direct Menu Access',
    method: 'GET',
    path: '/menu/:name',
    description: 'Access the Durable Object directly by name.',
    params: [{ name: 'name', type: 'path', placeholder: 'london-2025-11-25-...' }],
  },
  {
    title: 'Last Refresh',
    method: 'GET',
    path: '/menu/last-refresh/:location',
    description: 'Get the last refresh timestamp for a location.',
    params: [{ name: 'location', type: 'path', defaultValue: 'london', placeholder: 'london, dublin, sf' }],
  },
]

function McpConfigSection() {
  return (
    <section class="bg-white border-4 border-black p-6 neo-shadow mb-16">
      <div class="flex flex-col md:flex-row md:items-center justify-between mb-6 border-b-4 border-black pb-4 gap-4">
        <h2 class="text-2xl font-black uppercase tracking-tight">Copy MCP Configuration</h2>
        <select
          id="mcp-platform-select"
          onchange="updateMcpConfig()"
          class="bg-white border-2 border-black p-2 font-bold uppercase focus:bg-yellow-300 outline-none w-full md:w-auto"
        >
          <option value="claude">Claude Code</option>
          <option value="cursor">Cursor IDE</option>
          <option value="others">Others (JSON)</option>
        </select>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-8 items-center">
        <div
          id="mcp-icon-container"
          class="w-24 h-24 flex items-center justify-center border-4 border-black bg-white shrink-0 mx-auto md:mx-0"
        >
          {/* Icon inserted via JS */}
        </div>

        <div class="w-full">
          <div class="mb-4">
            <p id="mcp-instruction" class="font-bold text-sm mb-2 text-gray-600 uppercase">
              Instruction
            </p>
            <div
              id="mcp-snippet-container"
              class="bg-black text-white p-4 font-mono text-sm overflow-x-auto border-2 border-black relative min-h-[3.5rem] flex items-center"
            >
              <code id="mcp-snippet" class="whitespace-pre-wrap break-all">
                Loading...
              </code>
            </div>
          </div>

          <button
            id="mcp-action-btn"
            onclick="performMcpAction()"
            class="w-full md:w-auto px-8 py-3 bg-yellow-300 text-black font-black uppercase border-4 border-black hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all neo-shadow active:translate-x-[4px] active:translate-y-[4px] active:shadow-none"
          >
            Copy Command
          </button>
        </div>
      </div>
    </section>
  )
}

function EndpointTester(props: EndpointConfig) {
  // Generate a semi-stable ID for the DOM elements
  const id = `endpoint-${props.path.replace(/[^a-zA-Z0-9]/g, '-')}-${props.method}`.toLowerCase()
  const methodColor = props.method === 'GET' ? 'bg-green-400' : 'bg-blue-400'

  return (
    <div class="bg-white border-4 border-black p-6 neo-shadow mb-12" id={id}>
      <div class="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-8 border-b-4 border-black pb-6">
        <div>
          <h2 class="text-2xl md:text-3xl font-black uppercase tracking-tight">{props.title}</h2>
          <p class="font-bold text-sm mt-2 text-gray-700">{props.description}</p>
        </div>
        <div class="flex items-center gap-0 font-mono font-bold text-lg shrink-0">
          <span class={`px-4 py-2 border-2 border-black text-black ${methodColor} border-r-0`}>{props.method}</span>
          <span class="bg-white px-4 py-2 border-2 border-black text-black truncate max-w-[200px] md:max-w-none">{props.path}</span>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Configuration Column */}
        <div class="flex flex-col gap-6">
          <div class="flex items-center gap-2">
            <div class="w-4 h-4 bg-black"></div>
            <h3 class="font-black text-lg uppercase underline decoration-4 underline-offset-4 decoration-black">Configuration</h3>
          </div>

          <div class="space-y-4 bg-gray-50 p-4 border-2 border-black">
            {props.params.length === 0 && <p class="text-gray-500 italic font-bold text-center py-4">No parameters required.</p>}

            {props.params.map((param) => {
              let badgeColor = 'bg-blue-500'
              if (param.type === 'path') badgeColor = 'bg-red-500'
              if (param.type === 'header') badgeColor = 'bg-orange-500'

              return (
                <div class="flex flex-col gap-1">
                  <label class="font-bold text-xs uppercase flex justify-between">
                    <span>{param.name}</span>
                    <span class={`px-1 text-[10px] text-white ${badgeColor}`}>{param.type}</span>
                  </label>
                  <input
                    type="text"
                    class="w-full border-2 border-black p-3 font-mono text-sm neo-input transition-all focus:bg-yellow-100"
                    data-param-name={param.name}
                    data-param-type={param.type}
                    placeholder={param.placeholder || ''}
                    value={param.defaultValue || ''}
                  />
                </div>
              )
            })}
          </div>

          <button
            onclick={`executeRequest('${id}', '${props.method}', '${props.path}')`}
            class="w-full bg-black text-white font-black uppercase py-4 text-xl border-4 border-black hover:bg-yellow-400 hover:text-black hover:border-black transition-all neo-shadow mt-auto active:translate-x-[4px] active:translate-y-[4px] active:shadow-none"
          >
            Execute Request
          </button>

          <div class="grid grid-cols-3 gap-2">
            <button
              onclick={`copySnippet(this, '${id}', 'curl', '${props.method}', '${props.path}')`}
              class="bg-white text-black text-xs font-bold uppercase py-2 border-2 border-black hover:bg-gray-100 active:translate-y-[2px]"
            >
              Copy Curl
            </button>
            <button
              onclick={`copySnippet(this, '${id}', 'node', '${props.method}', '${props.path}')`}
              class="bg-white text-black text-xs font-bold uppercase py-2 border-2 border-black hover:bg-gray-100 active:translate-y-[2px]"
            >
              Copy Node
            </button>
            <button
              onclick={`copySnippet(this, '${id}', 'python', '${props.method}', '${props.path}')`}
              class="bg-white text-black text-xs font-bold uppercase py-2 border-2 border-black hover:bg-gray-100 active:translate-y-[2px]"
            >
              Copy Python
            </button>
          </div>
        </div>

        {/* Results Column */}
        <div class="flex flex-col h-full min-h-[300px]">
          <div class="flex items-center gap-2 mb-4">
            <div class="w-4 h-4 bg-black"></div>
            <h3 class="font-black text-lg uppercase underline decoration-4 underline-offset-4 decoration-black">Response</h3>
          </div>
          <div class="flex-grow bg-gray-900 border-4 border-black p-4 text-green-400 font-mono text-sm overflow-auto shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] relative">
            <div class="result-content whitespace-pre-wrap break-all h-full">
              <span class="text-gray-600">// Waiting for request...</span>
            </div>
            <div class="status-badge absolute top-0 right-0 text-xs font-bold px-3 py-1 border-b-2 border-l-2 border-black hidden bg-white text-black"></div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function HomePage() {
  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="robots" content="noindex, nofollow, noarchive, nosnippet, noimageindex, nocache" />
        <meta name="googlebot" content="noindex, nofollow, noarchive, nosnippet, noimageindex" />
        <meta name="bingbot" content="noindex, nofollow, noarchive, nosnippet, noimageindex" />

        <title>Intercom Menu API</title>
        <meta name="description" content="A RESTful API to retrieve weekly food menu for Intercom" />

        <link rel="icon" type="image/png" href="/assets/favicon.png" />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Intercom Menu API" />
        <meta property="og:description" content="A RESTful API to retrieve weekly food menu for Intercom" />
        <meta property="og:image" content="https://intercom-menu.jasonpraful.co.uk/assets/og.png" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Intercom Menu API" />
        <meta name="twitter:description" content="A RESTful API to retrieve weekly food menu for Intercom" />
        <meta name="twitter:image" content="https://intercom-menu.jasonpraful.co.uk/assets/og.png" />

        <script src="https://cdn.tailwindcss.com"></script>
        <style
          dangerouslySetInnerHTML={{
            __html: `
          body { font-family: 'Courier New', Courier, monospace; background-image: radial-gradient(#000 1px, transparent 1px); background-size: 20px 20px; }
          .neo-shadow { box-shadow: 8px 8px 0px 0px rgba(0,0,0,1); }
          .neo-input:focus { outline: none; }
          /* Custom scrollbar */
          ::-webkit-scrollbar { width: 12px; height: 12px; }
          ::-webkit-scrollbar-track { background: #fff; border-left: 2px solid #000; }
          ::-webkit-scrollbar-thumb { background: #000; border: 2px solid #fff; }
          ::-webkit-scrollbar-thumb:hover { background: #333; }
        `,
          }}
        />
      </head>
      <body class="min-h-screen p-4 md:p-12 text-black selection:bg-yellow-300 selection:text-black">
        <div class="max-w-6xl mx-auto">
          <header class="mb-16 bg-white border-4 border-black p-8 neo-shadow relative overflow-hidden">
            <div class="absolute -top-12 -right-12 w-40 h-40 bg-yellow-300 rounded-full border-4 border-black z-0"></div>
            <div class="relative z-10">
              <a href="https://github.com/jasonpraful/intercom-menu" target="_blank" class="absolute top-0 right-0 hover:scale-110 transition-transform" aria-label="View source on GitHub">
                <svg class="w-8 h-8" viewBox="0 0 98 96" xmlns="http://www.w3.org/2000/svg">
                    <path fill-rule="evenodd" clip-rule="evenodd" d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z" fill="#000"/>
                </svg>
              </a>
              <div class="flex flex-row items-start gap-4 md:gap-6 mb-4">
                <img
                  src="https://storage-us-gcs.bfldr.com/78bxkjwcr4j9z9nfbmjf34n/v/1186671907/original/Intercom_Squinge_Black.png?Expires=1763922530&KeyName=gcs-bfldr-prod&Signature=LpCmXb_h-7iGdf_x6ptZeOu_YpE="
                  alt="Intercom Logo"
                  class="w-12 h-12 md:w-20 md:h-20 mt-2"
                />
                <h1 class="text-3xl md:text-7xl font-black uppercase tracking-tighter leading-none">
                  Intercom
                  <br />
                  Menu API
                </h1>
              </div>
              <div class="mb-8">
                <p class="font-bold text-sm md:text-lg uppercase tracking-wide">A RESTful API to retrieve weekly food menu for Intercom</p>
              </div>
              <div class="flex flex-wrap gap-4 items-center">
                <p class="text-xl font-bold bg-black text-white px-4 py-2 inline-block transform -rotate-1">EXPLORER & TESTER</p>
                <div class="h-1 bg-black flex-grow"></div>
                <p class="font-bold text-sm">v1.0.0</p>
              </div>
            </div>
          </header>

          <McpConfigSection />

          <main>
            {endpoints.map((endpoint) => (
              <EndpointTester {...endpoint} />
            ))}
          </main>
        </div>

        <script
          dangerouslySetInnerHTML={{
            __html: `
          /**
           * Client-side logic for Intercom Menu API Explorer
           * Handles MCP configuration, request execution, and code snippet generation.
           */

          // --- Constants ---
          const CLAUDE_ICON_PATH = "M5.07398 17.6249L9.9929 14.8666L10.074 14.625L9.9929 14.4905H9.74966L8.92534 14.4403L6.11452 14.3651L3.68209 14.2648L1.31723 14.1394L0.722633 14.014L0.168579 13.2743L0.222633 12.9107L0.722633 12.5722L1.43885 12.6349L3.01993 12.7477L5.39831 12.9107L7.11453 13.011L9.66858 13.2743H10.074L10.128 13.1113L9.9929 13.011L9.8848 12.9107L7.42534 11.2432L4.76317 9.48796L3.37128 8.47242L2.62804 7.95837L2.24966 7.48195L2.0875 6.42879L2.76317 5.67653L3.68209 5.73922L3.91182 5.80191L4.84426 6.51655L6.83074 8.05867L9.42534 9.96439L9.80371 10.2778L9.95608 10.175L9.97939 10.1023L9.80371 9.81394L8.39831 7.26881L6.89831 4.67352L6.22263 3.59529L6.04696 2.95587C5.97891 2.68753 5.93885 2.46553 5.93885 2.19107L6.70912 1.13791L7.14155 1L8.18209 1.13791L8.61452 1.51404L9.26317 2.99348L10.3037 5.31294L11.9253 8.47242L12.3983 9.41274L12.6551 10.2778L12.7497 10.5411H12.9118V10.3907L13.047 8.61033L13.2902 6.42879L13.5334 3.62036L13.6145 2.83049L14.0064 1.87763L14.7902 1.36359L15.3983 1.65196L15.8983 2.3666L15.8307 2.83049L15.5334 4.76128L14.9524 7.78285L14.574 9.81394H14.7902L15.047 9.55065L16.074 8.19659L17.7902 6.04012L18.547 5.18756L19.4388 4.24724L20.0064 3.79589H21.0875L21.8713 4.97442L21.5199 6.19057L20.4118 7.59478L19.4929 8.78586L18.1753 10.5511L17.3578 11.9704L17.4311 12.0875L17.628 12.0707L20.601 11.4313L22.2091 11.1429L24.128 10.817L24.9929 11.2182L25.0875 11.6319L24.7497 12.4719L22.6956 12.9734L20.2902 13.4624L16.7082 14.3056L16.6686 14.3375L16.7154 14.4069L18.3307 14.5532L19.0199 14.5908H20.7091L23.8578 14.829L24.6821 15.3681L25.1686 16.0326L25.0875 16.5466L23.8172 17.1861L22.1145 16.7849L18.128 15.832L16.7632 15.4935H16.574V15.6063L17.7091 16.7222L19.8037 18.6028L22.4118 21.0351L22.547 21.6369L22.2091 22.1133L21.8578 22.0632L19.5605 20.333L18.6686 19.5557L16.6686 17.8631H16.5334V18.0386L16.9929 18.7156L19.4388 22.3892L19.5605 23.5176L19.3848 23.8811L18.7497 24.1068L18.0605 23.9814L16.6145 21.9629L15.1416 19.7061L13.9524 17.675L13.8087 17.7657L13.101 25.323L12.7767 25.7116L12.0199 26L11.3848 25.5236L11.047 24.7462L11.3848 23.2041L11.7902 21.1981L12.1145 19.6058L12.4118 17.6249L12.5934 16.9631L12.5773 16.9188L12.4323 16.9432L10.9388 18.9915L8.66858 22.0632L6.87128 23.9814L6.43885 24.157L5.69561 23.7683L5.76317 23.0787L6.18209 22.4644L8.66858 19.3049L10.1686 17.3365L11.1353 16.2066L11.1259 16.0432L11.0725 16.0386L4.46588 20.3455L3.2902 20.496L2.77669 20.0196L2.84425 19.2422L3.0875 18.9915L5.07398 17.6249Z";

          // --- Helper Functions ---

          /**
           * Collects input values from the endpoint configuration form.
           */
          function getRequestData(containerId, pathTemplate) {
            const container = document.getElementById(containerId);
            const inputs = container.querySelectorAll('input[data-param-name]');
            
            let finalPath = pathTemplate;
            const queryParams = new URLSearchParams();
            const headers = {};
            
            inputs.forEach(input => {
              const name = input.dataset.paramName;
              const type = input.dataset.paramType;
              const value = input.value.trim();

              if (type === 'path') {
                finalPath = finalPath.replace(':' + name, value);
              } else if (type === 'query' && value) {
                queryParams.append(name, value);
              } else if (type === 'header' && value) {
                headers[name] = value;
              }
            });

            if (finalPath.includes(':')) {
                throw new Error('Missing path parameters');
            }
            
            const queryString = queryParams.toString();
            const baseUrl = window.location.origin;
            const url = baseUrl + finalPath + (queryString ? '?' + queryString : '');

            return { url, headers };
          }

          /**
           * Updates the MCP configuration display based on selected platform.
           */
          function updateMcpConfig() {
            const select = document.getElementById('mcp-platform-select');
            const iconContainer = document.getElementById('mcp-icon-container');
            const snippet = document.getElementById('mcp-snippet');
            const instruction = document.getElementById('mcp-instruction');
            const actionBtn = document.getElementById('mcp-action-btn');
            
            const platform = select.value;
            const mcpUrl = window.location.origin + '/mcp';
            
            if (platform === 'claude') {
              iconContainer.innerHTML = \`<svg viewBox="0 0 26 26" class="w-12 h-12" fill="#D97757" xmlns="http://www.w3.org/2000/svg"><path d="\${CLAUDE_ICON_PATH}"/></svg>\`;
              snippet.textContent = \`claude mcp add --transport http intercom-menu \${mcpUrl}\`;
              instruction.textContent = "Run this command in your terminal";
              actionBtn.textContent = "Copy Command";
            } else if (platform === 'cursor') {
              iconContainer.innerHTML = \`<img src="/assets/cursor.png" class="w-12 h-12 object-contain" alt="Cursor Logo" />\`;
              
              const config = JSON.stringify({ url: mcpUrl });
              const encoded = btoa(config);
              const cursorLink = \`https://cursor.com/en-US/install-mcp?name=intercom-menu&config=\${encoded}\`;
              
              snippet.textContent = cursorLink;
              instruction.textContent = "Open this link to install automatically";
              actionBtn.textContent = "Open Link";
              
              // Store link for action button
              actionBtn.dataset.link = cursorLink;
            } else {
              iconContainer.innerHTML = '<div class="text-4xl">📦</div>';
              const jsonConfig = JSON.stringify({
                "intercom-menu": {
                  "url": mcpUrl
                }
              }, null, 2);
              snippet.textContent = jsonConfig;
              instruction.textContent = "Add this to your MCP config file";
              actionBtn.textContent = "Copy Config";
            }
          }
          
          /**
           * Executes the action for the MCP configuration (Copy or Open).
           */
          async function performMcpAction() {
            const select = document.getElementById('mcp-platform-select');
            const platform = select.value;
            const btn = document.getElementById('mcp-action-btn');
            
            if (platform === 'cursor') {
              const link = btn.dataset.link;
              window.open(link, '_blank');
            } else {
              const text = document.getElementById('mcp-snippet').textContent;
              try {
                await navigator.clipboard.writeText(text);
                const originalText = btn.textContent;
                btn.textContent = 'COPIED!';
                btn.classList.add('bg-yellow-300');
                setTimeout(() => {
                  btn.textContent = originalText;
                  btn.classList.remove('bg-yellow-300');
                }, 2000);
              } catch (err) {
                alert('Failed to copy: ' + err.message);
              }
            }
          }

          /**
           * Generates and copies code snippets for various languages.
           */
          async function copySnippet(btn, containerId, type, method, pathTemplate) {
            try {
              const { url, headers } = getRequestData(containerId, pathTemplate);
              const hasHeaders = Object.keys(headers).length > 0;
              let snippet = '';
              
              switch(type) {
                case 'curl':
                  let headerStr = '';
                  Object.entries(headers).forEach(([k, v]) => {
                    headerStr += \` -H "\${k}: \${v}"\`;
                  });
                  snippet = \`curl -X \${method}\${headerStr} "\${url}"\`;
                  break;
                  
                case 'node':
                  const options = { method };
                  if (hasHeaders) options.headers = headers;
                  
                  const optionsStr = JSON.stringify(options, null, 2);
                  snippet = \`const res = await fetch("\${url}", \${optionsStr});\nconst data = await res.json();\nconsole.log(data);\`;
                  break;
                  
                case 'python':
                  snippet = 'import requests\\n\\n';
                  if (hasHeaders) {
                    snippet += \`headers = \${JSON.stringify(headers)}\\n\`;
                    snippet += \`response = requests.\${method.toLowerCase()}("\${url}", headers=headers)\`;
                  } else {
                    snippet += \`response = requests.\${method.toLowerCase()}("\${url}")\`;
                  }
                  snippet += '\\nprint(response.json())';
                  break;
              }
              
              await navigator.clipboard.writeText(snippet);
              
              const originalText = btn.textContent;
              btn.textContent = 'COPIED!';
              btn.classList.add('bg-yellow-300');
              setTimeout(() => {
                btn.textContent = originalText;
                btn.classList.remove('bg-yellow-300');
              }, 2000);
              
            } catch (err) {
              alert('Error generating snippet: ' + err.message);
            }
          }

          /**
           * Executes the API request from the browser.
           */
          async function executeRequest(containerId, method, pathTemplate) {
            const container = document.getElementById(containerId);
            const resultDiv = container.querySelector('.result-content');
            const statusBadge = container.querySelector('.status-badge');
            
            // Reset UI
            resultDiv.innerHTML = '<span class="text-yellow-400 animate-pulse">> Fetching data...</span>';
            statusBadge.className = 'status-badge absolute top-0 right-0 text-xs font-bold px-3 py-1 border-b-2 border-l-2 border-black bg-yellow-300 text-black';
            statusBadge.textContent = 'LOADING...';
            statusBadge.classList.remove('hidden');

            try {
              const { url, headers } = getRequestData(containerId, pathTemplate);

              const start = performance.now();
              const res = await fetch(url, { 
                method,
                headers: headers
              });
              const duration = Math.round(performance.now() - start);
              
              let data;
              const contentType = res.headers.get('content-type');
              if (contentType && contentType.includes('application/json')) {
                data = await res.json();
              } else {
                data = await res.text();
              }

              // Status styling
              const isSuccess = res.ok;
              statusBadge.className = 'status-badge absolute top-0 right-0 text-xs font-bold px-3 py-1 border-b-2 border-l-2 border-black ' + 
                (isSuccess ? 'bg-green-400 text-black' : 'bg-red-500 text-white');
              statusBadge.textContent = res.status + ' ' + res.statusText + ' (' + duration + 'ms)';

              // Format output
              const output = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
              resultDiv.textContent = output;
            } catch (err) {
              statusBadge.className = 'status-badge absolute top-0 right-0 text-xs font-bold px-3 py-1 border-b-2 border-l-2 border-black bg-red-600 text-white';
              statusBadge.textContent = 'ERROR';
              resultDiv.textContent = '> Error: ' + err.message;
            }
          }

          // Initialize on load
          document.addEventListener('DOMContentLoaded', updateMcpConfig);
        `,
          }}
        />
      </body>
    </html>
  )
}
