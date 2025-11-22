export function NotFoundPage() {
  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="robots" content="noindex, nofollow" />
        <title>404 - Not Found | Intercom Menu API</title>
        <link rel="icon" type="image/png" href="/assets/favicon.png" />
        
        <script src="https://cdn.tailwindcss.com"></script>
        <style dangerouslySetInnerHTML={{ __html: `
          body { font-family: 'Courier New', Courier, monospace; background-image: radial-gradient(#000 1px, transparent 1px); background-size: 20px 20px; }
          .neo-shadow { box-shadow: 8px 8px 0px 0px rgba(0,0,0,1); }
        `}} />
      </head>
      <body class="min-h-screen p-4 md:p-12 text-black selection:bg-yellow-300 selection:text-black flex flex-col">
        <div class="max-w-6xl mx-auto w-full flex-grow flex flex-col">
          <header class="mb-16 bg-white border-4 border-black p-8 neo-shadow relative overflow-hidden">
            <div class="absolute -top-12 -right-12 w-40 h-40 bg-red-500 rounded-full border-4 border-black z-0"></div>
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
                <h1 class="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-none">
                  404<br/>Not Found
                </h1>
              </div>
              <div class="mb-8">
                <p class="font-bold text-sm md:text-lg uppercase tracking-wide">
                  The requested resource could not be found.
                </p>
              </div>
              <div class="flex flex-wrap gap-4 items-center">
                <p class="text-xl font-bold bg-red-500 text-white px-4 py-2 inline-block transform -rotate-1 border-2 border-black">
                  ERROR
                </p>
                <div class="h-1 bg-black flex-grow"></div>
                <a href="/" class="font-bold text-sm bg-yellow-300 px-4 py-2 border-2 border-black hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all neo-shadow active:translate-x-[4px] active:translate-y-[4px] active:shadow-none uppercase">
                  Return Home
                </a>
              </div>
            </div>
          </header>
          
          <main class="flex-grow flex items-center justify-center">
            <div class="bg-white border-4 border-black p-8 neo-shadow max-w-2xl w-full text-center transform rotate-1">
              <h2 class="text-3xl font-black uppercase mb-4">Where are you going?</h2>
              <p class="font-bold mb-8 text-lg">
                It seems you've wandered off the menu. The page you're looking for doesn't exist or has been moved.
              </p>
              <div class="flex justify-center gap-4">
                 <a href="/" class="inline-block bg-black text-white font-black uppercase py-4 px-8 border-4 border-black hover:bg-yellow-400 hover:text-black hover:border-black transition-all neo-shadow active:translate-x-[4px] active:translate-y-[4px] active:shadow-none text-xl">
                  Go Back Home
                </a>
              </div>
            </div>
          </main>
        </div>
      </body>
    </html>
  )
}

