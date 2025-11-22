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

