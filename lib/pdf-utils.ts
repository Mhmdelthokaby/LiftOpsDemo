import html2canvas from "html2canvas"
import jsPDF from "jspdf"
import type { MaintenanceContract, MaintenanceVisitDetails } from "@/lib/api"

// Helper function to sanitize filenames
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[<>:"/\\|?*]/g, '_') // Replace invalid file characters
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/_{2,}/g, '_') // Replace multiple underscores with single
    .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
    .substring(0, 255) // Limit length
}

// Helper function to load image and convert to base64
async function loadImageAsBase64(src: string, timeout: number = 10000): Promise<string> {
  return new Promise((resolve, reject) => {
    // Skip if already base64 or data URL
    if (src.startsWith('data:') || src.startsWith('http')) {
      resolve(src)
      return
    }
    
    // Handle relative URLs - use window.location if available (browser), otherwise use origin from src
    let imageUrl: string
    if (typeof window !== 'undefined' && window.location) {
      imageUrl = src.startsWith('/') ? `${window.location.origin}${src}` : `${window.location.origin}/${src}`
    } else {
      // Fallback for SSR (shouldn't happen in client components)
      imageUrl = src.startsWith('/') ? src : `/${src}`
    }
    
    const img = new Image()
    img.crossOrigin = 'anonymous'
    
    const timeoutId = setTimeout(() => {
      // Return fallback instead of rejecting to prevent PDF generation failure
      console.warn(`Image load timeout: ${imageUrl}, using fallback`)
      resolve('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==')
    }, timeout)
    
    img.onload = () => {
      clearTimeout(timeoutId)
      try {
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth || img.width
        canvas.height = img.naturalHeight || img.height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          console.warn('Failed to get canvas context, using fallback')
          resolve('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==')
          return
        }
        ctx.drawImage(img, 0, 0)
        const base64 = canvas.toDataURL('image/png')
        resolve(base64)
      } catch (error) {
        console.warn('Error converting image to base64:', error)
        // Return fallback instead of rejecting
        resolve('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==')
      }
    }
    
    img.onerror = () => {
      clearTimeout(timeoutId)
      // Return empty data URL as fallback instead of rejecting
      console.warn(`Failed to load image: ${imageUrl}, using fallback`)
      resolve('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==')
    }
    
    img.src = imageUrl
  })
}

// Helper function to replace all image src attributes with base64 data URLs
async function replaceImagesWithBase64(html: string): Promise<string> {
  // Skip if no images in HTML
  if (!html.includes('<img')) {
    return html
  }
  
  const imageSrcs: string[] = []
  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = html
  
  // Find all image sources
  const images = tempDiv.querySelectorAll('img')
  images.forEach(img => {
    const src = img.getAttribute('src')
    if (src && !src.startsWith('data:') && !src.startsWith('http')) {
      // Avoid duplicates
      if (!imageSrcs.includes(src)) {
        imageSrcs.push(src)
      }
    }
  })
  
  // If no images to process, return original HTML
  if (imageSrcs.length === 0) {
    return html
  }
  
  // Load all images and create a map
  const imageMap = new Map<string, string>()
  await Promise.all(
    imageSrcs.map(async (src) => {
      try {
        const base64 = await loadImageAsBase64(src)
        imageMap.set(src, base64)
      } catch (error) {
        console.warn(`Failed to load image ${src}:`, error)
        // Use fallback for failed images
        imageMap.set(src, 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==')
      }
    })
  )
  
  // Replace image sources in HTML
  let processedHtml = html
  imageMap.forEach((base64, src) => {
    // Escape special regex characters in src
    const escapedSrc = src.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    // Replace both single and double quotes
    processedHtml = processedHtml.replace(
      new RegExp(`src=["']${escapedSrc}["']`, 'g'),
      `src="${base64}"`
    )
    // Also handle src without quotes (edge case)
    processedHtml = processedHtml.replace(
      new RegExp(`src=${escapedSrc}(?=[\\s>])`, 'g'),
      `src="${base64}"`
    )
  })
  
  return processedHtml
}

export interface PdfOptions {
  headerTitle?: string
  headerSubtitle?: string
  filename?: string
}

export function generateFullPdfTemplateHtml(
  contentHtml: string,
  options: PdfOptions = {},
  baseUrl?: string
): string {
  const headerTitle = options.headerTitle || "LiftOps Elevators & Escalators"
  const headerSubtitle = options.headerSubtitle || "كولينز للمصاعد والسلالم الكهربائية"
  const logoUrl = baseUrl ? `${baseUrl}/icon.svg` : '/icon.svg'

  return `
    <div style="position: relative; width: 210mm; min-height: 297mm; padding: 30px; background-color: #ffffff; color: #000000; font-family: Arial, sans-serif; box-sizing: border-box;">
      <!-- Header -->
      <div style="position: absolute; top: 30px; right: 30px; text-align: right; color: #000000;">
        <div style="font-weight: 300; font-size: 18px; color: #000000;">${headerTitle}</div>
        <div style="font-weight: 300; font-size: 18px; margin-top: 4px; color: #dc2626;">${headerSubtitle}</div>
      </div>
      
      <!-- Content -->
      <div style="margin-top: 50px; padding: 20px; color: #000000;">
        ${contentHtml}
      </div>
      
      <!-- Footer -->
      <div style="position: absolute; bottom: 30px; left: 30px; right: 30px;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <img src="${logoUrl}" alt="LiftOps Logo" style="width: 60px; height: 60px; object-fit: contain;" onerror="this.style.display='none';" />
          <div style="flex: 1;">
            <div style="border-left: 2px solid #dc2626; padding-left: 12px; padding-top: 20px; padding-bottom: 20px;">
              <div style="font-size: 18px; font-weight: 500; color: #dc2626;">Customer Service</div>
              <div style="display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 300; margin-top: 4px; color: #000000; line-height: 1.5;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2" style="flex-shrink: 0; vertical-align: middle; display: inline-block;"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                <span style="vertical-align: middle;">01022223207</span>
              </div>
              <div style="display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 300; margin-top: 4px; color: #000000; line-height: 1.5;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2" style="flex-shrink: 0; vertical-align: middle; display: inline-block;"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                <span style="vertical-align: middle;">info@liftops.com</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
}

export interface ProjectVisit {
  id: string
  visitDate: string
  completedDate?: string
  elevatorCode: string
  status: string
  spareParts?: Array<{
    itemName: string
    quantity: number
    priceAtTimeOfUsage: number
    totalPrice: number
  }>
}

export async function generatePDF(
  contentHtml: string,
  options: PdfOptions = {}
): Promise<void> {
  const filename = options.filename || "document.pdf"
  // Suppress console errors
  const originalError = console.error
  const originalWarn = console.warn

  const errorFilter = (...args: any[]) => {
    const msg = args.join(' ')
    if (msg.includes('unsupported color function') ||
      msg.includes('lab') ||
      msg.includes('oklch') ||
      msg.includes('parseColor') ||
      msg.includes('parseBackgroundColor')) {
      return
    }
    originalError.apply(console, args)
  }

  const warnFilter = (...args: any[]) => {
    const msg = args.join(' ')
    if (msg.includes('unsupported color function') ||
      msg.includes('lab') ||
      msg.includes('oklch')) {
      return
    }
    originalWarn.apply(console, args)
  }

  console.error = errorFilter
  console.warn = warnFilter

  try {
    // Create isolated element for PDF content
    const isolatedDiv = document.createElement('div')
    const width = 794 // A4 width in pixels at 96 DPI
    const height = 1123 // A4 height in pixels at 96 DPI

    isolatedDiv.style.cssText = `
      position: fixed;
      left: 0;
      top: 0;
      width: ${width}px;
      min-width: ${width}px;
      height: ${height}px;
      min-height: ${height}px;
      background-color: #ffffff !important;
      color: #000000 !important;
      padding: 30px;
      box-sizing: border-box;
      z-index: 99999;
      overflow: visible;
      display: block;
    `

    // Build HTML content
    const headerTitle = options.headerTitle || "LiftOps Elevators & Escalators"
    const headerSubtitle = options.headerSubtitle || "كولينز للمصاعد والسلالم الكهربائية"

    const htmlContent = `
      <div style="position: absolute; top: 30px; right: 30px; text-align: right; color: #000000 !important;">
        <div style="font-weight: 300; font-size: 18px; color: #000000 !important;">${headerTitle}</div>
        <div style="font-weight: 300; font-size: 18px; margin-top: 4px; color: #dc2626 !important;">${headerSubtitle}</div>
      </div>
      <div style="position: absolute; bottom: 30px; left: 30px; right: 30px;">
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
          <img src="/icon.svg" alt="LiftOps Logo" style="width: 60px; height: 60px; object-fit: contain;" />
          <div style="flex: 1;">
            <div style="border-left: 2px solid #dc2626 !important; padding-left: 12px; padding-top: 20px; padding-bottom: 20px;">
              <div style="font-size: 18px; font-weight: 500; color: #dc2626 !important;">Customer Service</div>
              <div style="display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 300; margin-top: 4px; color: #000000 !important; line-height: 1.5;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2" style="flex-shrink: 0; vertical-align: middle; display: inline-block;"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                <span style="vertical-align: middle;">01022223207</span>
              </div>
              <div style="display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 300; margin-top: 4px; color: #000000 !important; line-height: 1.5;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2" style="flex-shrink: 0; vertical-align: middle; display: inline-block;"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                <span style="vertical-align: middle;">info@liftops.com</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div style="margin-top: 50px; padding: 20px; color: #000000 !important;">
        ${contentHtml}
      </div>
    `
    
    // Convert images to base64 for production compatibility
    const htmlWithBase64Images = await replaceImagesWithBase64(htmlContent)
    isolatedDiv.innerHTML = htmlWithBase64Images

    document.body.appendChild(isolatedDiv)

    // Wait for ALL images to load (not just the first one)
    const images = isolatedDiv.querySelectorAll('img')
    if (images.length > 0) {
      await Promise.all(
        Array.from(images).map((img) => {
          return new Promise<void>((resolve) => {
            const htmlImg = img as HTMLImageElement
            if (htmlImg.complete && htmlImg.naturalHeight !== 0) {
              // Image already loaded
              resolve()
            } else {
              // Wait for image to load or error
              htmlImg.onload = () => resolve()
              htmlImg.onerror = () => {
                // Even if image fails, continue (fallback already applied)
                resolve()
              }
              // Timeout after 5 seconds per image
              setTimeout(() => resolve(), 5000)
            }
          })
        })
      )
      // Additional delay to ensure rendering
      await new Promise(resolve => setTimeout(resolve, 300))
    } else {
      // No images, just wait a bit for rendering
      await new Promise(resolve => setTimeout(resolve, 200))
    }

    isolatedDiv.offsetHeight

    if (isolatedDiv.offsetWidth === 0 || isolatedDiv.offsetHeight === 0) {
      throw new Error(`Isolated element has invalid dimensions: ${isolatedDiv.offsetWidth}x${isolatedDiv.offsetHeight}`)
    }

    let canvas
    try {
      canvas = await html2canvas(isolatedDiv, {
        scale: 1.6,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        width: isolatedDiv.offsetWidth,
        height: isolatedDiv.offsetHeight,
        allowTaint: true,
        foreignObjectRendering: false,
        onclone: (clonedDoc, element) => {
          const allStyles = clonedDoc.querySelectorAll('style')
          allStyles.forEach((style) => {
            style.remove()
          })

          const allLinks = clonedDoc.querySelectorAll('link[rel="stylesheet"]')
          allLinks.forEach((link) => {
            link.remove()
          })

          // Ensure table cells have proper centering styles using flexbox for better html2canvas support
          const allTables = clonedDoc.querySelectorAll('table')
          allTables.forEach((table) => {
            const htmlTable = table as HTMLElement
            const tableStyle = htmlTable.getAttribute('style') || ''
            if (!tableStyle.includes('border-collapse')) {
              htmlTable.setAttribute('style', tableStyle + ' border-collapse: collapse;')
            }
          })

          const allTableCells = clonedDoc.querySelectorAll('td, th')
          allTableCells.forEach((cell) => {
            const htmlCell = cell as HTMLElement
            let currentStyle = htmlCell.getAttribute('style') || ''
            // Remove any CSS variable references but preserve other styles
            if (currentStyle.includes('var(') || currentStyle.includes('oklch') || currentStyle.includes('lab')) {
              currentStyle = currentStyle.replace(/[^;]*var\([^)]+\)[^;]*;?/gi, '')
              currentStyle = currentStyle.replace(/[^;]*oklch\([^)]+\)[^;]*;?/gi, '')
              currentStyle = currentStyle.replace(/[^;]*lab\([^)]+\)[^;]*;?/gi, '')
            }
            // Force remove and re-add centering styles to ensure they're applied
            currentStyle = currentStyle.replace(/text-align:\s*[^;!]+;?/gi, '')
            currentStyle = currentStyle.replace(/vertical-align:\s*[^;!]+;?/gi, '')
            // Add centering styles with !important at the end to ensure they override
            currentStyle = (currentStyle.trim() ? currentStyle.trim() + ' ' : '') + 'text-align: center !important; vertical-align: middle !important;'
            // Directly set the style attribute
            htmlCell.setAttribute('style', currentStyle)
            // Also set via style property to ensure it's applied (html2canvas reads computed styles)
            htmlCell.style.setProperty('text-align', 'center', 'important')
            htmlCell.style.setProperty('vertical-align', 'middle', 'important')

            // Ensure cell has equal padding and text alignment
            // Get original padding or use default
            const originalStyle = htmlCell.getAttribute('style') || ''
            const paddingMatch = originalStyle.match(/padding:\s*([^;]+)/i)
            const cellPadding = paddingMatch ? paddingMatch[1].trim() : '12px'

            // Set cell styles for centering
            htmlCell.style.setProperty('text-align', 'center', 'important')
            htmlCell.style.setProperty('vertical-align', 'middle', 'important')
            htmlCell.style.setProperty('padding', cellPadding, 'important')

            // Wrap content in centered div (html2canvas handles div centering better)
            const cellContent = htmlCell.innerHTML.trim()
            if (cellContent) {
              // Remove any existing wrapper and create a fresh one
              const existingDiv = htmlCell.querySelector('div')
              if (existingDiv) {
                existingDiv.setAttribute('style', 'text-align: center !important; width: 100%; margin: 0 auto;')
                existingDiv.style.setProperty('text-align', 'center', 'important')
                existingDiv.style.setProperty('width', '100%', 'important')
                existingDiv.style.setProperty('margin', '0 auto', 'important')
              } else {
                htmlCell.innerHTML = `<div style="text-align: center !important; width: 100%; margin: 0 auto;">${cellContent}</div>`
              }
            }
          })

          // Remove CSS variables from other elements, but preserve table cell centering
          const allElements = clonedDoc.querySelectorAll('*')
          allElements.forEach((el) => {
            const htmlEl = el as HTMLElement
            // Skip table cells as we've already processed them
            if (el.tagName === 'TD' || el.tagName === 'TH') {
              return
            }
            if (htmlEl.style.cssText) {
              const styleText = htmlEl.style.cssText
              if (styleText.includes('var(') || styleText.includes('oklch') || styleText.includes('lab') || styleText.includes('oklab') || styleText.includes('lch')) {
                // Remove modern color functions but keep other styles
                let cleanStyle = styleText
                  .replace(/(color|background|border|fill|stroke|outline)[^;]*:\s*(oklch|oklab|lab|lch)\([^)]+\)[^;]*;?/gi, '')
                  .replace(/[^;]*var\([^)]+\)[^;]*;?/gi, '')

                if (cleanStyle.trim()) {
                  htmlEl.setAttribute('style', cleanStyle)
                } else {
                  htmlEl.removeAttribute('style')
                }
              }
            }

            // Look for SVG attributes that might cause issues
            if (el.tagName === 'svg' || el.parentElement?.tagName === 'svg') {
              const fill = el.getAttribute('fill')
              const stroke = el.getAttribute('stroke')
              if (fill && (fill.includes('oklch') || fill.includes('lab'))) el.setAttribute('fill', 'currentColor')
              if (stroke && (stroke.includes('oklch') || stroke.includes('lab'))) el.setAttribute('stroke', 'currentColor')
            }
          })
        },
      })
    } catch (error: any) {
      const errorMsg = error?.message || error?.toString() || ''

      if (errorMsg.includes('color') || errorMsg.includes('lab') || errorMsg.includes('oklch')) {
        try {
          canvas = await html2canvas(isolatedDiv, {
            scale: 1.6,
            useCORS: true,
            logging: false,
            backgroundColor: "#ffffff",
            allowTaint: true,
            onclone: (clonedDoc) => {
              clonedDoc.querySelectorAll('style, link[rel="stylesheet"]').forEach((el) => {
                el.remove()
              })
              // Ensure table cells have proper centering styles
              const allTableCells = clonedDoc.querySelectorAll('td, th')
              allTableCells.forEach((cell) => {
                const htmlCell = cell as HTMLElement
                let currentStyle = htmlCell.getAttribute('style') || ''
                currentStyle = currentStyle.replace(/text-align:\s*[^;!]+;?/gi, '')
                currentStyle = currentStyle.replace(/vertical-align:\s*[^;!]+;?/gi, '')
                currentStyle = (currentStyle.trim() ? currentStyle.trim() + ' ' : '') + 'text-align: center !important; vertical-align: middle !important;'
                htmlCell.setAttribute('style', currentStyle)
                htmlCell.style.setProperty('text-align', 'center', 'important')
                htmlCell.style.setProperty('vertical-align', 'middle', 'important')

                // Ensure cell has proper padding and text alignment
                const originalStyle = htmlCell.getAttribute('style') || ''
                const paddingMatch = originalStyle.match(/padding:\s*([^;]+)/i)
                const cellPadding = paddingMatch ? paddingMatch[1].trim() : '12px'

                htmlCell.style.setProperty('text-align', 'center', 'important')
                htmlCell.style.setProperty('vertical-align', 'middle', 'important')
                htmlCell.style.setProperty('padding', cellPadding, 'important')

                // Wrap content in centered div
                const cellContent = htmlCell.innerHTML.trim()
                if (cellContent) {
                  const existingDiv = htmlCell.querySelector('div')
                  if (existingDiv) {
                    existingDiv.setAttribute('style', 'text-align: center !important; width: 100%; margin: 0 auto;')
                    existingDiv.style.setProperty('text-align', 'center', 'important')
                    existingDiv.style.setProperty('width', '100%', 'important')
                    existingDiv.style.setProperty('margin', '0 auto', 'important')
                  } else {
                    htmlCell.innerHTML = `<div style="text-align: center !important; width: 100%; margin: 0 auto;">${cellContent}</div>`
                  }
                }
              })

              // Recursive clean
              clonedDoc.querySelectorAll('*').forEach((el) => {
                const htmlEl = el as HTMLElement
                if (htmlEl.style.cssText) {
                  htmlEl.style.cssText = htmlEl.style.cssText
                    .replace(/(color|background|border|fill|stroke|outline)[^;]*:\s*(oklch|oklab|lab|lch)\([^)]+\)[^;]*;?/gi, '')
                    .replace(/[^;]*var\([^)]+\)[^;]*;?/gi, '')
                }
                if (el.tagName === 'svg' || el.parentElement?.tagName === 'svg') {
                  const fill = el.getAttribute('fill')
                  const stroke = el.getAttribute('stroke')
                  if (fill && (fill.includes('oklch') || fill.includes('lab'))) el.setAttribute('fill', 'currentColor')
                  if (stroke && (stroke.includes('oklch') || stroke.includes('lab'))) el.setAttribute('stroke', 'currentColor')
                }
              })
            },
          })
        } catch (retryError: any) {
          try {
            canvas = await html2canvas(isolatedDiv, {
              scale: 1,
              useCORS: true,
              backgroundColor: "#ffffff",
              allowTaint: true,
              onclone: (clonedDoc) => {
                clonedDoc.querySelectorAll('style, link[rel="stylesheet"], [style*="var("], [style*="oklch"], [style*="lab"]').forEach((el) => {
                  el.remove()
                })
                // Ensure table cells have proper centering styles
                const allTableCells = clonedDoc.querySelectorAll('td, th')
                allTableCells.forEach((cell) => {
                  const htmlCell = cell as HTMLElement
                  let currentStyle = htmlCell.getAttribute('style') || ''
                  currentStyle = currentStyle.replace(/text-align:\s*[^;!]+;?/gi, '')
                  currentStyle = currentStyle.replace(/vertical-align:\s*[^;!]+;?/gi, '')
                  currentStyle = (currentStyle.trim() ? currentStyle.trim() + ' ' : '') + 'text-align: center !important; vertical-align: middle !important;'
                  htmlCell.setAttribute('style', currentStyle)
                  htmlCell.style.setProperty('text-align', 'center', 'important')
                  htmlCell.style.setProperty('vertical-align', 'middle', 'important')

                  // Wrap content in a centered div for better html2canvas support
                  const cellContent = htmlCell.innerHTML.trim()
                  if (cellContent && !cellContent.startsWith('<div') && !cellContent.startsWith('<span')) {
                    htmlCell.innerHTML = `<div style="text-align: center !important; width: 100%; display: flex; align-items: center; justify-content: center; min-height: 100%;">${cellContent}</div>`
                  }
                })
              },
            })
          } catch (finalError) {
            throw new Error(`PDF generation failed: ${finalError}`)
          }
        }
      } else {
        throw error
      }
    } finally {
      if (isolatedDiv.parentNode) {
        document.body.removeChild(isolatedDiv)
      }
    }

    if (!canvas) {
      throw new Error("Failed to generate canvas")
    }

    if (canvas.width === 0 || canvas.height === 0) {
      throw new Error(`Canvas has invalid dimensions: ${canvas.width}x${canvas.height}`)
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error("Failed to get canvas context")
    }

    const a4Width = 210
    const a4Height = 297

    const imgWidth = a4Width
    const imgHeight = Math.min((canvas.height * a4Width) / canvas.width, a4Height)

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    })

    let imgData: string
    try {
      // Use JPEG with lower quality for smaller file size
      imgData = canvas.toDataURL("image/jpeg", 0.85)

      if (!imgData || !imgData.startsWith("data:image")) {
        throw new Error("Failed to convert canvas to image data")
      }
      pdf.addImage(imgData, "JPEG", 0, 0, imgWidth, imgHeight, undefined, "FAST")
    } catch (imgError: any) {
      try {
        imgData = canvas.toDataURL("image/jpeg", 0.85)
        pdf.addImage(imgData, "JPEG", 0, 0, imgWidth, imgHeight, undefined, "FAST")
      } catch (jpegError) {
        throw new Error(`Failed to convert canvas to image: ${imgError?.message || imgError}`)
      }
    }

    pdf.save(filename)

    console.log("PDF exported successfully")
  } catch (error: any) {
    console.error = originalError
    console.warn = originalWarn

    const errorMsg = error?.message || error?.toString() || ''

    if (errorMsg.includes('lab') || errorMsg.includes('oklch') || errorMsg.includes('color function')) {
      console.warn("PDF generation encountered a color parsing warning, but this is usually non-fatal. PDF may still have been generated.")
    } else {
      console.error("Error generating PDF:", error)
      throw new Error(`Failed to generate PDF: ${errorMsg}`)
    }
  } finally {
    console.error = originalError
    console.warn = originalWarn
  }
}

export async function generateMaintenanceProjectReportPDF(
  contract: MaintenanceContract,
  visits: ProjectVisit[]
): Promise<void> {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  const formatCurrency = (amount: number) => {
    if (amount === 0) return "Free"
    return amount.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })
  }

  // Group visits by elevator code
  const visitsByElevator = new Map<string, ProjectVisit[]>()
  visits.forEach(visit => {
    if (!visitsByElevator.has(visit.elevatorCode)) {
      visitsByElevator.set(visit.elevatorCode, [])
    }
    visitsByElevator.get(visit.elevatorCode)!.push(visit)
  })

  // Sort visits by date (newest first)
  visitsByElevator.forEach((elevatorVisits) => {
    elevatorVisits.sort((a, b) => {
      const dateA = new Date(a.visitDate).getTime()
      const dateB = new Date(b.visitDate).getTime()
      return dateB - dateA
    })
  })

  let html = `
    <div style="font-family: Arial, sans-serif; color: #000000;">
      <h1 style="font-size: 28px; font-weight: 600; margin-bottom: 24px; color: #000000;">Maintenance Project Report</h1>
      
      <div style="margin-bottom: 30px;">
        <h2 style="font-size: 20px; font-weight: 600; margin-bottom: 16px; color: #000000;">Project Information</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; font-weight: 500; color: #666; width: 35%; text-align: center; vertical-align: middle;">Project Number:</td>
            <td style="padding: 8px 0; color: #000000; text-align: center; vertical-align: middle;">${contract.projectNumber || `M-${contract.id.substring(0, 8).toUpperCase()}`}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: 500; color: #666;">Customer:</td>
            <td style="padding: 8px 0; color: #000000;">${contract.customerName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: 500; color: #666;">Phone:</td>
            <td style="padding: 8px 0; color: #000000;">${contract.customerPhone}</td>
          </tr>
          ${contract.customerEmail ? `
          <tr>
            <td style="padding: 8px 0; font-weight: 500; color: #666;">Email:</td>
            <td style="padding: 8px 0; color: #000000;">${contract.customerEmail}</td>
          </tr>
          ` : ''}
          ${contract.customerAddress ? `
          <tr>
            <td style="padding: 8px 0; font-weight: 500; color: #666; text-align: center; vertical-align: middle;">Address:</td>
            <td style="padding: 8px 0; color: #000000; text-align: center; vertical-align: middle;">${contract.customerAddress}${contract.customerCity ? `, ${contract.customerCity}` : ''}</td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding: 8px 0; font-weight: 500; color: #666; text-align: center; vertical-align: middle;">Elevators:</td>
            <td style="padding: 8px 0; color: #000000; text-align: center; vertical-align: middle;">${contract.elevatorCount}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: 500; color: #666; text-align: center; vertical-align: middle;">Start Date:</td>
            <td style="padding: 8px 0; color: #000000; text-align: center; vertical-align: middle;">${formatDate(contract.startDate)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: 500; color: #666; text-align: center; vertical-align: middle;">End Date:</td>
            <td style="padding: 8px 0; color: #000000; text-align: center; vertical-align: middle;">${formatDate(contract.endDate)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: 500; color: #666; text-align: center; vertical-align: middle;">Price/Month:</td>
            <td style="padding: 8px 0; color: #000000; text-align: center; vertical-align: middle;">${formatCurrency(contract.pricePerMonth)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: 500; color: #666; text-align: center; vertical-align: middle;">Free Months:</td>
            <td style="padding: 8px 0; color: #000000; text-align: center; vertical-align: middle;">${contract.freeMonths} ${contract.freeMonths === 1 ? 'month' : 'months'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: 500; color: #666; text-align: center; vertical-align: middle;">Status:</td>
            <td style="padding: 8px 0; color: #000000; text-align: center; vertical-align: middle;">${contract.status}</td>
          </tr>
          ${contract.technicianName ? `
          <tr>
            <td style="padding: 8px 0; font-weight: 500; color: #666; text-align: center; vertical-align: middle;">Technician:</td>
            <td style="padding: 8px 0; color: #000000; text-align: center; vertical-align: middle;">${contract.technicianName}</td>
          </tr>
          ` : ''}
        </table>
      </div>

      <div style="margin-bottom: 30px;">
        <h2 style="font-size: 20px; font-weight: 600; margin-bottom: 16px; color: #000000;">Maintenance Visits</h2>
        <div style="margin-bottom: 20px; color: #666; font-size: 14px;">
          Total Visits: ${visits.length}
        </div>
  `

  if (visitsByElevator.size === 0) {
    html += `
        <div style="padding: 20px; background-color: #f5f5f5; border-radius: 4px; color: #666;">
          No maintenance visits recorded for this project.
        </div>
    `
  } else {
    // Sort elevator codes
    const sortedElevatorCodes = Array.from(visitsByElevator.keys()).sort()

    sortedElevatorCodes.forEach((elevatorCode, index) => {
      const elevatorVisits = visitsByElevator.get(elevatorCode)!

      html += `
        <div style="margin-bottom: 30px; page-break-inside: avoid;">
          <h3 style="font-size: 18px; font-weight: 600; margin-bottom: 12px; color: #000000; border-bottom: 2px solid #dc2626; padding-bottom: 8px;">
            Elevator: ${elevatorCode}
          </h3>
          <div style="margin-bottom: 8px; color: #666; font-size: 14px;">
            Total Visits: ${elevatorVisits.length}
          </div>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr style="background-color: #f5f5f5;">
                <th style="padding: 10px; text-align: left; font-weight: 600; color: #000000; border-bottom: 2px solid #ddd;">Visit Date</th>
                <th style="padding: 10px; text-align: left; font-weight: 600; color: #000000; border-bottom: 2px solid #ddd;">Completed Date</th>
                <th style="padding: 10px; text-align: left; font-weight: 600; color: #000000; border-bottom: 2px solid #ddd;">Status</th>
                <th style="padding: 10px; text-align: right; font-weight: 600; color: #000000; border-bottom: 2px solid #ddd;">Spare Parts Cost</th>
              </tr>
            </thead>
            <tbody>
      `

      elevatorVisits.forEach((visit) => {
        const statusColor = visit.status.toLowerCase() === 'done' ? '#16a34a' : visit.status.toLowerCase() === 'cancelled' ? '#dc2626' : '#666'
        const sparePartsTotal = visit.spareParts?.reduce((sum, sp) => sum + sp.totalPrice, 0) || 0

        html += `
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee; color: #000000; text-align: center; vertical-align: middle;">${formatDate(visit.visitDate)}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; color: #000000; text-align: center; vertical-align: middle;">${visit.completedDate ? formatDate(visit.completedDate) : '-'}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; color: ${statusColor}; font-weight: 500; text-align: center; vertical-align: middle;">${visit.status}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center; vertical-align: middle; color: #000000;">${sparePartsTotal > 0 ? formatCurrency(sparePartsTotal) : '-'}</td>
              </tr>
        `

        if (visit.spareParts && visit.spareParts.length > 0) {
          html += `
              <tr>
                <td colspan="4" style="padding: 10px 10px 10px 30px; border-bottom: 1px solid #eee; background-color: #fafafa;">
                  <div style="font-size: 12px; color: #666; margin-bottom: 4px;">Spare Parts:</div>
          `
          visit.spareParts.forEach((sp) => {
            html += `
                  <div style="font-size: 12px; color: #000000; margin-left: 8px;">
                    • ${sp.itemName} (Qty: ${sp.quantity}) - ${formatCurrency(sp.totalPrice)}
                  </div>
            `
          })
          html += `
                </td>
              </tr>
          `
        }
      })

      html += `
            </tbody>
          </table>
        </div>
      `
    })
  }

  html += `
      </div>
    </div>
  `

  const filename = `Maintenance_Report_${contract.projectNumber || contract.id.substring(0, 8)}_${new Date().toISOString().split('T')[0]}.pdf`

  await generatePDF(html, {
    filename,
    headerTitle: "LiftOps Elevators & Escalators",
    headerSubtitle: "كولينز للمصاعد والسلالم الكهربائية"
  })
}

export function generateMaintenanceReportHTML(
  visitDetails: MaintenanceVisitDetails,
  contract?: MaintenanceContract
): string {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  const formatCurrency = (amount: number) => {
    if (amount === 0) return "Free"
    return amount.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })
  }

  const statusColor = visitDetails.status.toLowerCase() === 'done' ? '#16a34a' :
    visitDetails.status.toLowerCase() === 'cancelled' ? '#dc2626' : '#666'

  const allChecklistGood = visitDetails.checklistItems.length > 0 &&
    visitDetails.checklistItems.every(item => item.isCompleted)
  const someChecklistIssues = visitDetails.checklistItems.some(item => !item.isCompleted)

  const totalSparePartsCost = visitDetails.spareParts.reduce((sum, sp) => sum + sp.totalPrice, 0)
  const paidSparePartsCost = visitDetails.spareParts
    .filter(sp => sp.isPaid)
    .reduce((sum, sp) => sum + sp.totalPrice, 0)

  // Get maintenance date (use completed date if available, otherwise visit date)
  const maintenanceDate = visitDetails.completedDate || visitDetails.visitDate
  const clientName = visitDetails.customerName || contract?.customerName || 'N/A'
  const projectAddress = visitDetails.customerAddress || contract?.customerAddress || 'N/A'
  const projectNumber = visitDetails.projectNumber || contract?.projectNumber || 'N/A'

  let html = ``

  if (visitDetails.checklistItems && visitDetails.checklistItems.length > 0) {
    const totalItems = visitDetails.checklistItems.length
    
    // A4 page dimensions in mm (converted to pixels for HTML preview at 96 DPI)
    // A4: 210mm × 297mm = 794px × 1123px
    const PAGE_WIDTH_MM = 210
    const PAGE_HEIGHT_MM = 297
    const MM_TO_PX = 3.779527559 // 96 DPI conversion
    
    // Calculate actual heights in mm (same as PDF)
    const HEADER_HEIGHT_MM = 31
    const HEADER_MARGIN_MM = 1
    const FOOTER_HEIGHT_MM = 80
    const FOOTER_MARGIN_MM = 1
    
    // Calculate available content height
    const AVAILABLE_CONTENT_HEIGHT_MM = PAGE_HEIGHT_MM - HEADER_HEIGHT_MM - HEADER_MARGIN_MM - FOOTER_HEIGHT_MM - FOOTER_MARGIN_MM
    
    // Element heights in mm
    const TITLE_HEIGHT_MM = 15
    const TITLE_MARGIN_BOTTOM_MM = 8 // Margin below title
    const CLIENT_INFO_HEIGHT_MM = 25 // Client info table (2 rows with padding)
    const CLIENT_INFO_MARGIN_BOTTOM_MM = 8 // Margin below client info table
    const TABLE_HEADER_HEIGHT_MM = 12
    // Increased row height to account for text wrapping (items can have 2-3 lines of text)
    // Base height: 10px padding top + 10px padding bottom = 20px ≈ 5.3mm
    // Text height: ~14px per line, can wrap to 2-3 lines = 28-42px ≈ 7-11mm
    // Border: 1px top + 1px bottom = 2px ≈ 0.5mm
    // Total: ~18mm for 3-line text, using 20mm to be safe
    const ROW_HEIGHT_MM = 20 // Row height accounting for multi-line text (2-3 lines)
    const ROW_MARGIN_BOTTOM_MM = 0.5
    
    // Calculate notes section - notes will be on separate page
    const notesText = visitDetails.notes?.trim() || ''
    const hasNotes = notesText.length > 0
    
    // Distribute items across pages based on actual heights
    const pageBreakpoints: number[] = []
    let currentIndex = 0
    
    if (totalItems > 0) {
      let isFirstPage = true
      
      while (currentIndex < totalItems) {
        let availableHeight = AVAILABLE_CONTENT_HEIGHT_MM
        
        // First page has title, margins, and client info table
        if (isFirstPage) {
          const firstPageFixedElements = 
            TITLE_HEIGHT_MM + 
            TITLE_MARGIN_BOTTOM_MM + 
            CLIENT_INFO_HEIGHT_MM + 
            CLIENT_INFO_MARGIN_BOTTOM_MM
          availableHeight -= firstPageFixedElements
          isFirstPage = false
        }
        
        // Subtract table header height
        availableHeight -= TABLE_HEADER_HEIGHT_MM
        
        // Calculate how many rows fit - be very conservative to prevent row breaking
        let rowsInPage = 0
        let usedHeight = 0
        
        // Increase safety buffer to 5mm to ensure rows don't break
        // Also account for potential rounding errors and table borders
        const SAFETY_BUFFER_MM = 5
        const effectiveAvailableHeight = availableHeight - SAFETY_BUFFER_MM
        
        while (currentIndex + rowsInPage < totalItems) {
          const nextRowHeight = ROW_HEIGHT_MM + ROW_MARGIN_BOTTOM_MM
          // Check if adding this row would exceed available height
          // Use >= instead of > to be more conservative
          if (usedHeight + nextRowHeight >= effectiveAvailableHeight) {
            break // Stop before this row - it will go to next page
          }
          usedHeight += nextRowHeight
          rowsInPage++
        }
        
        // Ensure at least one row per page (if there are items remaining)
        if (rowsInPage === 0 && currentIndex < totalItems) {
          rowsInPage = 1
        }
        
        const pageEnd = currentIndex + rowsInPage
        pageBreakpoints.push(pageEnd)
        currentIndex = pageEnd
      }
    }
    
    // Notes page is inserted as the last page if notes exist
    const totalPages = pageBreakpoints.length + (hasNotes ? 1 : 0)
    const notesPageIndex = hasNotes ? totalPages - 1 : -1

    const headerTitle = "LiftOps Elevators & Escalators"
    const headerSubtitle = "كولينز للمصاعد والسلالم الكهربائية"

    // Template header - appears on EVERY page (matches PDF structure)
    const templateHeader = (pageNum: number, totalPagesNum: number) => `
      <div style="position: absolute; top: 15px; left: 30px; right: 30px; z-index: 10; display: flex; justify-content: space-between; align-items: flex-start;">
        <div style="flex: 1;">
          <img src="/icon.svg" alt="LiftOps Logo" style="width: 50px; height: 50px; object-fit: contain;" onerror="this.style.display='none';" />
        </div>
        <div style="flex: 1; text-align: right; color: #000000 !important;">
          <div style="font-weight: 300; font-size: 18px; color: #000000 !important;">${headerTitle}</div>
          <div style="font-weight: 300; font-size: 18px; margin-top: 4px; color: #dc2626 !important;">${headerSubtitle}</div>
        </div>
      </div>
    `

    // Template footer - appears on EVERY page (matches PDF structure)
    const templateFooter = (pageNum: number, totalPagesNum: number) => `
      <div style="position: absolute; bottom: 15px; left: 30px; right: 30px; z-index: 10;">
        <div style="display: flex; align-items: flex-end; gap: 12px; margin-bottom: 8px;">
          <img src="/icon.svg" alt="LiftOps Logo" style="width: 100px; height: 100px; object-fit: contain;" onerror="this.style.display='none';" />
          <div style="flex: 1;">
            <div style="border-left: 2px solid #dc2626 !important; padding-left: 12px; padding-top: 12px; padding-bottom: 12px;">
              <div style="font-size: 16px; font-weight: 500; color: #dc2626 !important;">Customer Service</div>
              <div style="display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 300; margin-top: 4px; color: #000000 !important; line-height: 1.5;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2" style="flex-shrink: 0; vertical-align: middle; display: inline-block;"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                <span style="vertical-align: middle;">01022223207</span>
              </div>
              <div style="display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 300; margin-top: 4px; color: #000000 !important; line-height: 1.5;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2" style="flex-shrink: 0; vertical-align: middle; display: inline-block;"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                <span style="vertical-align: middle;">info@liftops.com</span>
              </div>
            </div>
          </div>
          <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 8px; position: relative;">
            <img src="/mhmd.jpeg" alt="Signature" style="width: 250px; height: 75px; object-fit: contain; position: relative; z-index: 1;" onerror="this.style.display='none';" />
            <img src="/liftops-sign.png" alt="Signature" style="width: 120px; height: 110px; object-fit: contain; position: relative; z-index: 3; margin-top: -135px; margin-right: 40px;" onerror="this.style.display='none';" />
          </div>
        </div>
      </div>
    `

    // Split items across pages dynamically
    for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
      // Check if this is the notes page
      const isNotesPage = hasNotes && pageIndex === notesPageIndex
      
      // Start a new page with template wrapper
      html += `
        <div style="position: relative; width: 210mm; min-height: 297mm; padding: 30px; background-color: #ffffff; color: #000000; font-family: Arial, sans-serif; box-sizing: border-box; ${pageIndex > 0 ? 'page-break-before: always; margin-top: 40px; padding-top: 20px; border-top: 2px dashed #ccc;' : ''}">
          ${templateHeader(pageIndex + 1, totalPages)}
          ${templateFooter(pageIndex + 1, totalPages)}
          
          <div style="margin-top: 80px; margin-bottom: 100px; padding: 0 20px; color: #000000 !important; position: relative; z-index: 1; max-height: 943px; overflow: hidden;">
      `

      if (isNotesPage) {
        // Notes page - dedicated page for notes only
        html += `
          <div style="margin-bottom: 30px;">
            <h2 style="font-size: 25px; font-weight: 300; margin-bottom: 16px; color: #000000;">Maintenance Notes</h2>
            <div style="background-color: #f5f5f5; padding: 16px; border-radius: 4px; color: #000000; line-height: 1.6; white-space: pre-wrap;">
              ${visitDetails.notes}
            </div>
          </div>
        `
      } else {
        // Regular checklist page
        // Notes page is at the end, so no adjustment needed
        const checklistPageIndex = pageIndex
        const startIndex = checklistPageIndex === 0 ? 0 : pageBreakpoints[checklistPageIndex - 1]
        const endIndex = pageBreakpoints[checklistPageIndex] || totalItems
        const pageItems = visitDetails.checklistItems.slice(startIndex, endIndex)

        // Add header info only on first checklist page
        if (checklistPageIndex === 0) {
        html += `
          <div style="margin-bottom: 30px;">
            <table style="width: 100%; border-collapse: collapse; border: 1px solid #ddd;">
              <tr>
                <td style="padding: 12px; border: 1px solid #ddd; font-weight: 600; color: #000000; background-color: #f5f5f5; width: 20%; text-align: center; vertical-align: middle;">Client Name</td>
                <td style="padding: 12px; border: 1px solid #ddd; color: #000000; width: 30%; text-align: center; vertical-align: middle;">${clientName}</td>
                <td style="padding: 12px; border: 1px solid #ddd; font-weight: 600; color: #000000; background-color: #f5f5f5; width: 20%; text-align: center; vertical-align: middle;">Date</td>
                <td style="padding: 12px; border: 1px solid #ddd; color: #000000; width: 30%; text-align: center; vertical-align: middle;">${formatDate(maintenanceDate)}</td>
              </tr>
              <tr>
                <td style="padding: 12px; border: 1px solid #ddd; font-weight: 600; color: #000000; background-color: #f5f5f5; text-align: center; vertical-align: middle;">Address</td>
                <td style="padding: 12px; border: 1px solid #ddd; color: #000000; text-align: center; vertical-align: middle;">${projectAddress}</td>
                <td style="padding: 12px; border: 1px solid #ddd; font-weight: 600; color: #000000; background-color: #f5f5f5; text-align: center; vertical-align: middle;">Project No</td>
                <td style="padding: 12px; border: 1px solid #ddd; color: #000000; text-align: center; vertical-align: middle;">${projectNumber}</td>
              </tr>
            </table>
          </div>
        `

        }

        // Add checklist table for this page
      // Table header must repeat on every page, rows must not break
      html += `
        <div style="margin-bottom: 20px;">
          <table style="width: 100%; border-collapse: collapse; border: 1px solid #ddd; table-layout: fixed; page-break-inside: avoid;">
            <thead>
              <tr style="background-color: #f5f5f5; page-break-inside: avoid;">
                <th style="padding: 10px; border: 1px solid #ddd; font-weight: 600; color: #000000; text-align: center; vertical-align: middle; width: 6%; white-space: nowrap;">#</th>
                <th style="padding: 10px; border: 1px solid #ddd; font-weight: 600; color: #000000; text-align: center; vertical-align: middle; width: 25%;">Item Name</th>
                <th style="padding: 10px; border: 1px solid #ddd; font-weight: 600; color: #000000; text-align: center; vertical-align: middle; width: 12%;">Status</th>
                <th style="padding: 10px; border: 1px solid #ddd; font-weight: 600; color: #000000; text-align: center; vertical-align: middle; width: 10%;">Count</th>
                <th style="padding: 10px; border: 1px solid #ddd; font-weight: 600; color: #000000; text-align: center; vertical-align: middle; width: 12%;">Percentage</th>
                <th style="padding: 10px; border: 1px solid #ddd; font-weight: 600; color: #000000; text-align: center; vertical-align: middle; width: 35%;">Notes</th>
              </tr>
            </thead>
            <tbody>
      `

        pageItems.forEach((item, itemIndexInPage) => {
          // Calculate the global index (continues across pages)
          const globalIndex = startIndex + itemIndexInPage

          // Determine status based on status field or isCompleted
          let itemStatus: string
          let itemStatusColor: string

          if (item.status === 'good') {
            itemStatus = 'Good'
            itemStatusColor = '#16a34a' // Green
          } else if (item.status === 'medium') {
            itemStatus = 'Medium'
            itemStatusColor = '#f59e0b' // Amber/Orange
          } else if (item.status === 'bad') {
            itemStatus = 'Bad'
            itemStatusColor = '#dc2626' // Red
          } else {
            // Fallback for old data or if status is not set
            itemStatus = item.isCompleted ? 'Good' : 'Not Good'
            itemStatusColor = item.isCompleted ? '#16a34a' : '#dc2626'
          }

          const countDisplay = item.count !== undefined && item.count !== null ? item.count.toString() : '-'
          const percentageDisplay = item.percentage !== undefined && item.percentage !== null
            ? `${item.percentage.toFixed(2)}%`
            : '-'
          const notesDisplay = item.notes && item.notes.trim() !== '' ? item.notes : '-'

          html += `
                <tr style="page-break-inside: avoid; page-break-after: auto; break-inside: avoid;">
                  <td style="padding: 10px; border: 1px solid #ddd; color: #000000; text-align: center; vertical-align: middle; font-weight: 600; white-space: nowrap; page-break-inside: avoid;">${globalIndex + 1}</td>
                  <td style="padding: 10px; border: 1px solid #ddd; color: #000000; text-align: center; vertical-align: middle; word-wrap: break-word; page-break-inside: avoid;">${item.checklistItemTitle}</td>
                  <td style="padding: 10px; border: 1px solid #ddd; color: ${itemStatusColor}; font-weight: 600; text-align: center; vertical-align: middle; word-wrap: break-word; page-break-inside: avoid;">${itemStatus}</td>
                  <td style="padding: 10px; border: 1px solid #ddd; color: #000000; text-align: center; vertical-align: middle; word-wrap: break-word; page-break-inside: avoid;">${countDisplay}</td>
                  <td style="padding: 10px; border: 1px solid #ddd; color: #000000; text-align: center; vertical-align: middle; word-wrap: break-word; page-break-inside: avoid;">${percentageDisplay}</td>
                  <td style="padding: 10px; border: 1px solid #ddd; color: #000000; text-align: center; vertical-align: middle; font-size: 11px; word-wrap: break-word; page-break-inside: avoid;">${notesDisplay}</td>
                </tr>
          `
        })

        html += `
              </tbody>
            </table>
          </div>
        `

        // Add spare parts only on last checklist page
        const lastChecklistPageIndex = pageBreakpoints.length - 1
        if (checklistPageIndex === lastChecklistPageIndex && visitDetails.spareParts && visitDetails.spareParts.length > 0) {
          html += `
          <div style="margin-bottom: 30px;">
            <h2 style="font-size: 25px; font-weight: 300; margin-bottom: 16px; color: #000000;">Spare Parts</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background-color: #f5f5f5;">
                  <th style="padding: 10px; text-align: left; font-weight: 600; color: #000000; border-bottom: 2px solid #ddd;">Item</th>
                  <th style="padding: 10px; text-align: center; font-weight: 600; color: #000000; border-bottom: 2px solid #ddd;">Quantity</th>
                  <th style="padding: 10px; text-align: right; font-weight: 600; color: #000000; border-bottom: 2px solid #ddd;">Unit Price</th>
                  <th style="padding: 10px; text-align: right; font-weight: 600; color: #000000; border-bottom: 2px solid #ddd;">Total Price</th>
                  <th style="padding: 10px; text-align: center; font-weight: 600; color: #000000; border-bottom: 2px solid #ddd;">Paid</th>
                </tr>
              </thead>
              <tbody>
        `

        visitDetails.spareParts.forEach((sp) => {
          html += `
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #eee; color: #000000; text-align: center; vertical-align: middle;">${sp.itemName}</td>
                  <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center; vertical-align: middle; color: #000000;">${sp.quantity}</td>
                  <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center; vertical-align: middle; color: #000000;">${formatCurrency(sp.priceAtTimeOfUsage)}</td>
                  <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center; vertical-align: middle; color: #000000; font-weight: 500;">${formatCurrency(sp.totalPrice)}</td>
                  <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center; vertical-align: middle; color: ${sp.isPaid ? '#16a34a' : '#f59e0b'}; font-weight: 500;">${sp.isPaid ? 'Yes' : 'No'}</td>
                </tr>
          `
        })

        html += `
              </tbody>
              <tfoot>
                <tr style="background-color: #f5f5f5; font-weight: 600;">
                  <td colspan="3" style="padding: 10px; text-align: right; color: #000000; border-top: 2px solid #ddd;">Total:</td>
                  <td style="padding: 10px; text-align: right; color: #000000; border-top: 2px solid #ddd;">${formatCurrency(totalSparePartsCost)}</td>
                  <td style="padding: 10px; text-align: center; color: #000000; border-top: 2px solid #ddd;"></td>
                </tr>
                ${paidSparePartsCost !== totalSparePartsCost ? `
                <tr>
                  <td colspan="3" style="padding: 10px; text-align: right; color: #666;">Paid Amount:</td>
                  <td style="padding: 10px; text-align: right; color: #16a34a; font-weight: 500;">${formatCurrency(paidSparePartsCost)}</td>
                  <td style="padding: 10px; text-align: center; color: #000000;"></td>
                </tr>
                <tr>
                  <td colspan="3" style="padding: 10px; text-align: right; color: #666;">Remaining:</td>
                  <td style="padding: 10px; text-align: right; color: #f59e0b; font-weight: 500;">${formatCurrency(totalSparePartsCost - paidSparePartsCost)}</td>
                  <td style="padding: 10px; text-align: center; color: #000000;"></td>
                </tr>
                ` : ''}
              </tfoot>
            </table>
          </div>
        `
        }
      }

      // Close page wrapper
      html += `
          </div>
        </div>
      `
    }
  }

  return html
}

export async function generateMaintenanceReportPDF(
  visitDetails: MaintenanceVisitDetails,
  contract?: MaintenanceContract
): Promise<void> {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  }
  
  // Sanitize filename to remove invalid characters
  const sanitizeFilename = (name: string) => {
    return name
      .replace(/[<>:"/\\|?*]/g, '_') // Replace invalid file characters
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .replace(/_{2,}/g, '_') // Replace multiple underscores with single
      .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
  }
  
  const visitDateStr = formatDate(visitDetails.visitDate).replace(/,/g, '').replace(/\s+/g, '_')
  const elevatorCode = visitDetails.elevatorCode || 'Unknown'
  const filename = sanitizeFilename(`Maintenance_Visit_${elevatorCode}_${visitDateStr}.pdf`)

  // Always use multi-page generation to ensure proper A4 pagination
  const totalItems = visitDetails.checklistItems?.length || 0

  if (totalItems > 0) {
    // Use multi-page generation for proper A4 page breaks
    await generateMultiPageMaintenancePDF(visitDetails, contract, filename)
  } else {
    // No checklist items - use single page method
    const html = generateMaintenanceReportHTML(visitDetails, contract)
    await generatePDF(html, {
      filename,
      headerTitle: "LiftOps Elevators & Escalators",
      headerSubtitle: "كولينز للمصاعد والسلالم الكهربائية"
    })
  }
}

async function generateMultiPageMaintenancePDF(
  visitDetails: MaintenanceVisitDetails,
  contract: MaintenanceContract | undefined,
  filename: string
): Promise<void> {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  const formatCurrency = (amount: number) => {
    if (amount === 0) return "Free"
    return amount.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })
  }

  const statusColor = visitDetails.status.toLowerCase() === 'done' ? '#16a34a' :
    visitDetails.status.toLowerCase() === 'cancelled' ? '#dc2626' : '#666'

  const totalSparePartsCost = visitDetails.spareParts.reduce((sum, sp) => sum + sp.totalPrice, 0)
  const paidSparePartsCost = visitDetails.spareParts
    .filter(sp => sp.isPaid)
    .reduce((sum, sp) => sum + sp.totalPrice, 0)

  const maintenanceDate = visitDetails.completedDate || visitDetails.visitDate
  const clientName = visitDetails.customerName || contract?.customerName || 'N/A'
  const projectAddress = visitDetails.customerAddress || contract?.customerAddress || 'N/A'
  const projectNumber = visitDetails.projectNumber || contract?.projectNumber || 'N/A'

  const totalItems = visitDetails.checklistItems?.length || 0
  const hasSpareParts = visitDetails.spareParts && visitDetails.spareParts.length > 0
  
  // A4 page dimensions in mm
  const PAGE_WIDTH_MM = 210
  const PAGE_HEIGHT_MM = 297
  
  // Calculate actual heights in mm
  // Header: logo (50px ≈ 13mm) + text (36px ≈ 9.5mm) + top margin (20px ≈ 5.3mm) + bottom margin (10px ≈ 2.6mm)
  const HEADER_HEIGHT_MM = 13 + 9.5 + 5.3 + 2.6 // ≈ 30.4mm, rounded to 31mm
  const HEADER_MARGIN_MM = 1 // margin between header and content
  
  // Footer: logo (100px ≈ 26.5mm) + contact info (60px ≈ 15.9mm) + signatures (110px ≈ 29.1mm) + margins
  const FOOTER_HEIGHT_MM = 26.5 + 15.9 + 29.1 + 5.3 + 2.6 // ≈ 79.4mm, rounded to 80mm
  const FOOTER_MARGIN_MM = 1 // margin between content and footer
  
  // Calculate available content height
  const AVAILABLE_CONTENT_HEIGHT_MM = PAGE_HEIGHT_MM - HEADER_HEIGHT_MM - HEADER_MARGIN_MM - FOOTER_HEIGHT_MM - FOOTER_MARGIN_MM
  
  // Element heights in mm
  const TITLE_HEIGHT_MM = 15 // "Inspection Report" title
  const TITLE_MARGIN_BOTTOM_MM = 8 // Margin below title
  const CLIENT_INFO_HEIGHT_MM = 25 // Client info table (2 rows with padding)
  const CLIENT_INFO_MARGIN_BOTTOM_MM = 8 // Margin below client info table
  const TABLE_HEADER_HEIGHT_MM = 12 // Table header row
  // Increased row height to account for text wrapping (items can have 2-3 lines of text)
  // Base height: 10px padding top + 10px padding bottom = 20px ≈ 5.3mm
  // Text height: ~14px per line, can wrap to 2-3 lines = 28-42px ≈ 7-11mm
  // Border: 1px top + 1px bottom = 2px ≈ 0.5mm
  // Total: ~18mm for 3-line text, using 20mm to be safe
  const ROW_HEIGHT_MM = 20 // Row height accounting for multi-line text (2-3 lines)
  const ROW_MARGIN_BOTTOM_MM = 0.5 // Small margin between rows
  
  // Calculate notes section
  const notesText = visitDetails.notes?.trim() || ''
  const hasNotes = notesText.length > 0
  
  // Distribute items across pages based on actual heights
  const pageBreakpoints: number[] = []
  let currentIndex = 0
  
  if (totalItems > 0) {
    let isFirstPage = true
    
    while (currentIndex < totalItems) {
      let availableHeight = AVAILABLE_CONTENT_HEIGHT_MM
      
      // First page has title, margins, and client info table
      if (isFirstPage) {
        const firstPageFixedElements = 
          TITLE_HEIGHT_MM + 
          TITLE_MARGIN_BOTTOM_MM + 
          CLIENT_INFO_HEIGHT_MM + 
          CLIENT_INFO_MARGIN_BOTTOM_MM
        availableHeight -= firstPageFixedElements
        isFirstPage = false
      }
      
      // Subtract table header height
      availableHeight -= TABLE_HEADER_HEIGHT_MM
      
      // Calculate how many rows fit - be very conservative to prevent row breaking
      let rowsInPage = 0
      let usedHeight = 0
      
      // Increase safety buffer to account for variable row heights
      // Rows can vary in height due to text wrapping (2-3 lines), so we need extra buffer
      // Also account for potential rounding errors and table borders
      const SAFETY_BUFFER_MM = 10 // Increased from 5mm to account for multi-line text variations
      const effectiveAvailableHeight = availableHeight - SAFETY_BUFFER_MM
      
      while (currentIndex + rowsInPage < totalItems) {
        const nextRowHeight = ROW_HEIGHT_MM + ROW_MARGIN_BOTTOM_MM
        // Check if adding this row would exceed available height
        // Use >= instead of > to be more conservative
        if (usedHeight + nextRowHeight >= effectiveAvailableHeight) {
          break // Stop before this row - it will go to next page
        }
        usedHeight += nextRowHeight
        rowsInPage++
      }
      
      // Ensure at least one row per page (if there are items remaining)
      if (rowsInPage === 0 && currentIndex < totalItems) {
        rowsInPage = 1
        usedHeight = ROW_HEIGHT_MM + ROW_MARGIN_BOTTOM_MM
      }
      
      const pageEnd = currentIndex + rowsInPage
      
      // Validate that we're not skipping items
      if (pageEnd > totalItems) {
        console.warn(`WARNING: Page ${pageBreakpoints.length + 1} end index ${pageEnd} exceeds total items ${totalItems}, adjusting to ${totalItems}`)
        pageBreakpoints.push(totalItems)
        break
      }
      
      pageBreakpoints.push(pageEnd)
      
      const pageStart = currentIndex
      console.log(`Page ${pageBreakpoints.length}: items ${pageStart} to ${pageEnd - 1} (indices), items ${pageStart + 1} to ${pageEnd} (numbers), rowsInPage: ${rowsInPage}, used height: ${usedHeight.toFixed(2)}mm / ${effectiveAvailableHeight.toFixed(2)}mm`)
      
      currentIndex = pageEnd
      
      // Safety check: if we didn't make progress, force increment to avoid infinite loop
      if (rowsInPage === 0) {
        console.error(`ERROR: No rows added to page ${pageBreakpoints.length}, forcing increment`)
        currentIndex++
        if (currentIndex >= totalItems) break
      }
    }
  }
  
  // Notes page is inserted as the last page if notes exist
  // Order: checklist pages -> spare parts page (if exists) -> notes page (if exists)
  const totalPages = pageBreakpoints.length + (hasSpareParts ? 1 : 0) + (hasNotes ? 1 : 0)
  const sparePartsPageIndex = hasSpareParts ? pageBreakpoints.length : -1
  const notesPageIndex = hasNotes ? totalPages - 1 : -1

  console.log(`Multi-page PDF: ${totalItems} items, ${totalPages} pages`)
  console.log(`Available content height: ${AVAILABLE_CONTENT_HEIGHT_MM}mm per page`)
  console.log(`Page breakpoints:`, pageBreakpoints)
  
  // Validate that all items are covered
  if (pageBreakpoints.length > 0) {
    const lastBreakpoint = pageBreakpoints[pageBreakpoints.length - 1]
    if (lastBreakpoint !== totalItems) {
      console.error(`ERROR: Last breakpoint (${lastBreakpoint}) does not match total items (${totalItems}). Fixing by adding final breakpoint.`)
      // Fix the issue by ensuring the last breakpoint includes all items
      pageBreakpoints[pageBreakpoints.length - 1] = totalItems
    }
    // Check for gaps and ensure continuity
    let expectedStart = 0
    const coveredIndices = new Set<number>()
    for (let i = 0; i < pageBreakpoints.length; i++) {
      const start = i === 0 ? 0 : pageBreakpoints[i - 1]
      const end = pageBreakpoints[i]
      console.log(`Page ${i + 1} will contain items ${start} to ${end - 1} (${end - start} items)`)
      if (start !== expectedStart) {
        console.error(`ERROR: Gap detected! Expected start ${expectedStart}, got ${start}. Items ${expectedStart} to ${start - 1} are missing!`)
      }
      // Track which indices are covered
      for (let idx = start; idx < end; idx++) {
        coveredIndices.add(idx)
      }
      expectedStart = end
    }
    // Verify all items are covered
    for (let i = 0; i < totalItems; i++) {
      if (!coveredIndices.has(i)) {
        console.error(`ERROR: Item at index ${i} (displayed as #${i + 1}) is not covered by any page!`)
      }
    }
  } else if (totalItems > 0) {
    console.error(`ERROR: No page breakpoints calculated but totalItems = ${totalItems}`)
    // Fallback: create a single page breakpoint
    pageBreakpoints.push(totalItems)
  }

  // Create PDF
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  })

  const headerTitle = "LiftOps Elevators & Escalators"
  const headerSubtitle = "كولينز للمصاعد والسلالم الكهربائية"

  // Generate each page
  for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
    if (pageIndex > 0) {
      pdf.addPage() // Add new page for pages after the first
    }

    // Check page type
    const isNotesPage = hasNotes && pageIndex === notesPageIndex
    const isSparePartsOnlyPage = hasSpareParts && pageIndex === sparePartsPageIndex
    
    // Calculate the actual checklist page index (excluding spare parts and notes pages)
    // Checklist pages come first, so pageIndex directly maps to checklistPageIndex
    // unless there's a spare parts page before notes (which comes after all checklist pages)
    let checklistPageIndex = -1
    if (!isNotesPage && !isSparePartsOnlyPage) {
      // This is a checklist page
      // Checklist pages are always at the beginning, so pageIndex = checklistPageIndex
      checklistPageIndex = pageIndex
    }
    
    // Build page HTML
    let pageHtml = `
      <div style="font-family: Arial, sans-serif; color: #000000;">
    `
    
    if (isNotesPage) {
      // Notes page - dedicated page for notes only
      console.log(`Generating page ${pageIndex + 1} of ${totalPages} (Notes page)`)
      pageHtml += `
        <div style="margin-bottom: 30px;">
          <h2 style="font-size: 25px; font-weight: 300; margin-bottom: 16px; color: #000000;">Maintenance Notes</h2>
          <div style="background-color: #f5f5f5; padding: 16px; border-radius: 4px; color: #000000; line-height: 1.6; white-space: pre-wrap;">
            ${visitDetails.notes}
          </div>
        </div>
      `
    } else if (checklistPageIndex >= 0) {
      // Regular page with checklist items
      const startIndex = checklistPageIndex === 0 ? 0 : pageBreakpoints[checklistPageIndex - 1]
      // Ensure endIndex doesn't exceed totalItems and handles last page correctly
      const endIndex = checklistPageIndex < pageBreakpoints.length 
        ? pageBreakpoints[checklistPageIndex] 
        : totalItems
      const pageItems = visitDetails.checklistItems.slice(startIndex, endIndex)
      
      // Validate we're not skipping items
      if (pageItems.length === 0 && startIndex < totalItems) {
        console.error(`ERROR: Page ${checklistPageIndex + 1} has no items but startIndex ${startIndex} < totalItems ${totalItems}`)
      }
      
      console.log(`Generating page ${pageIndex + 1} of ${totalPages} (checklist page ${checklistPageIndex + 1}, items ${startIndex} to ${endIndex - 1} (indices), displayed as ${startIndex + 1} to ${endIndex}, count: ${pageItems.length})`)
      
      // Debug: log all items being added to this page
      if (pageItems.length > 0) {
        console.log(`Page ${checklistPageIndex + 1} items:`, pageItems.map((item, idx) => `#${startIndex + idx + 1}: ${item.checklistItemTitle}`).join(', '))
      } else {
        console.warn(`WARNING: Page ${checklistPageIndex + 1} has no items!`)
      }

      // Add header info only on first checklist page
      if (checklistPageIndex === 0) {
        pageHtml += `
          <h1 style="font-size: 28px; font-weight: 500; margin-bottom: 30px; color: #dc2626 !important; text-align: center;">Inspection Report</h1>
          
          <div style="margin-bottom: 30px;">
            <table style="width: 100%; border-collapse: collapse; border: 1px solid #ddd;">
              <tr>
                <td style="padding: 12px; border: 1px solid #ddd; font-weight: 600; color: #000000; background-color: #f5f5f5; width: 20%; text-align: center; vertical-align: middle;">Client Name</td>
                <td style="padding: 12px; border: 1px solid #ddd; color: #000000; width: 30%; text-align: center; vertical-align: middle;">${clientName}</td>
                <td style="padding: 12px; border: 1px solid #ddd; font-weight: 600; color: #000000; background-color: #f5f5f5; width: 20%; text-align: center; vertical-align: middle;">Date</td>
                <td style="padding: 12px; border: 1px solid #ddd; color: #000000; width: 30%; text-align: center; vertical-align: middle;">${formatDate(maintenanceDate)}</td>
              </tr>
              <tr>
                <td style="padding: 12px; border: 1px solid #ddd; font-weight: 600; color: #000000; background-color: #f5f5f5; text-align: center; vertical-align: middle;">Address</td>
                <td style="padding: 12px; border: 1px solid #ddd; color: #000000; text-align: center; vertical-align: middle;">${projectAddress}</td>
                <td style="padding: 12px; border: 1px solid #ddd; font-weight: 600; color: #000000; background-color: #f5f5f5; text-align: center; vertical-align: middle;">Project No</td>
                <td style="padding: 12px; border: 1px solid #ddd; color: #000000; text-align: center; vertical-align: middle;">${projectNumber}</td>
              </tr>
            </table>
          </div>
        `

      }

      // Add checklist table for this page
      // Table header must repeat on every page, rows must not break
      pageHtml += `
        <div style="margin-bottom: 20px;">
          <table style="width: 100%; border-collapse: collapse; border: 1px solid #ddd; table-layout: fixed;">
            <thead>
              <tr style="background-color: #f5f5f5; page-break-inside: avoid;">
                <th style="padding: 10px; border: 1px solid #ddd; font-weight: 600; color: #000000; text-align: center; vertical-align: middle; width: 6%; white-space: nowrap;">#</th>
                <th style="padding: 10px; border: 1px solid #ddd; font-weight: 600; color: #000000; text-align: center; vertical-align: middle; width: 25%;">Item Name</th>
                <th style="padding: 10px; border: 1px solid #ddd; font-weight: 600; color: #000000; text-align: center; vertical-align: middle; width: 12%;">Status</th>
                <th style="padding: 10px; border: 1px solid #ddd; font-weight: 600; color: #000000; text-align: center; vertical-align: middle; width: 10%;">Count</th>
                <th style="padding: 10px; border: 1px solid #ddd; font-weight: 600; color: #000000; text-align: center; vertical-align: middle; width: 12%;">Percentage</th>
                <th style="padding: 10px; border: 1px solid #ddd; font-weight: 600; color: #000000; text-align: center; vertical-align: middle; width: 35%;">Notes</th>
              </tr>
            </thead>
            <tbody>
      `

      pageItems.forEach((item, itemIndexInPage) => {
        const globalIndex = startIndex + itemIndexInPage

        let itemStatus: string
        let itemStatusColor: string

        if (item.status === 'good') {
          itemStatus = 'Good'
          itemStatusColor = '#16a34a' // Green
        } else if (item.status === 'medium') {
          itemStatus = 'Medium'
          itemStatusColor = '#f59e0b' // Amber/Orange
        } else if (item.status === 'bad') {
          itemStatus = 'Bad'
          itemStatusColor = '#dc2626' // Red
        } else {
          // Fallback for old data or if status is not set
          itemStatus = item.isCompleted ? 'Good' : 'Not Good'
          itemStatusColor = item.isCompleted ? '#16a34a' : '#dc2626'
        }

        const countDisplay = item.count !== undefined && item.count !== null ? item.count.toString() : '-'
        const percentageDisplay = item.percentage !== undefined && item.percentage !== null
          ? `${item.percentage.toFixed(2)}%`
          : '-'
        const notesDisplay = item.notes && item.notes.trim() !== '' ? item.notes : '-'

        pageHtml += `
              <tr style="page-break-inside: avoid; page-break-after: auto; break-inside: avoid;">
                <td style="padding: 10px; border: 1px solid #ddd; color: #000000; text-align: center; vertical-align: middle; font-weight: 600; white-space: nowrap; page-break-inside: avoid;">${globalIndex + 1}</td>
                <td style="padding: 10px; border: 1px solid #ddd; color: #000000; text-align: center; vertical-align: middle; word-wrap: break-word; line-height: 1.4; page-break-inside: avoid;">${item.checklistItemTitle}</td>
                <td style="padding: 10px; border: 1px solid #ddd; color: ${itemStatusColor}; font-weight: 600; text-align: center; vertical-align: middle; word-wrap: break-word; line-height: 1.4; page-break-inside: avoid;">${itemStatus}</td>
                <td style="padding: 10px; border: 1px solid #ddd; color: #000000; text-align: center; vertical-align: middle; word-wrap: break-word; line-height: 1.4; page-break-inside: avoid;">${countDisplay}</td>
                <td style="padding: 10px; border: 1px solid #ddd; color: #000000; text-align: center; vertical-align: middle; word-wrap: break-word; line-height: 1.4; page-break-inside: avoid;">${percentageDisplay}</td>
                <td style="padding: 10px; border: 1px solid #ddd; color: #000000; text-align: center; vertical-align: middle; font-size: 11px; word-wrap: break-word; line-height: 1.4; page-break-inside: avoid;">${notesDisplay}</td>
              </tr>
        `
      })

      pageHtml += `
            </tbody>
          </table>
        </div>
      `
    } else {
      // Spare parts only page
      console.log(`Generating page ${pageIndex + 1} of ${totalPages} (spare parts only)`)
    }

    // Add spare parts on designated page
    if (pageIndex === sparePartsPageIndex && visitDetails.spareParts && visitDetails.spareParts.length > 0) {
      pageHtml += `
        <div style="margin-bottom: 30px;">
          <h2 style="font-size: 25px; font-weight: 300; margin-bottom: 16px; color: #000000;">Spare Parts</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background-color: #f5f5f5;">
                <th style="padding: 10px; text-align: left; font-weight: 600; color: #000000; border-bottom: 2px solid #ddd;">Item</th>
                <th style="padding: 10px; text-align: center; font-weight: 600; color: #000000; border-bottom: 2px solid #ddd;">Quantity</th>
                <th style="padding: 10px; text-align: right; font-weight: 600; color: #000000; border-bottom: 2px solid #ddd;">Unit Price</th>
                <th style="padding: 10px; text-align: right; font-weight: 600; color: #000000; border-bottom: 2px solid #ddd;">Total Price</th>
                <th style="padding: 10px; text-align: center; font-weight: 600; color: #000000; border-bottom: 2px solid #ddd;">Paid</th>
              </tr>
            </thead>
            <tbody>
      `

      visitDetails.spareParts.forEach((sp) => {
        pageHtml += `
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee; color: #000000; text-align: center; vertical-align: middle;">${sp.itemName}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center; vertical-align: middle; color: #000000;">${sp.quantity}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center; vertical-align: middle; color: #000000;">${formatCurrency(sp.priceAtTimeOfUsage)}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center; vertical-align: middle; color: #000000; font-weight: 500;">${formatCurrency(sp.totalPrice)}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center; vertical-align: middle; color: ${sp.isPaid ? '#16a34a' : '#f59e0b'}; font-weight: 500;">${sp.isPaid ? 'Yes' : 'No'}</td>
              </tr>
        `
      })

      pageHtml += `
            </tbody>
            <tfoot>
              <tr style="background-color: #f5f5f5; font-weight: 600;">
                <td colspan="3" style="padding: 10px; text-align: right; color: #000000; border-top: 2px solid #ddd;">Total:</td>
                <td style="padding: 10px; text-align: right; color: #000000; border-top: 2px solid #ddd;">${formatCurrency(totalSparePartsCost)}</td>
                <td style="padding: 10px; text-align: center; color: #000000; border-top: 2px solid #ddd;"></td>
              </tr>
              ${paidSparePartsCost !== totalSparePartsCost ? `
              <tr>
                <td colspan="3" style="padding: 10px; text-align: right; color: #666;">Paid Amount:</td>
                <td style="padding: 10px; text-align: right; color: #16a34a; font-weight: 500;">${formatCurrency(paidSparePartsCost)}</td>
                <td style="padding: 10px; text-align: center; color: #000000;"></td>
              </tr>
              <tr>
                <td colspan="3" style="padding: 10px; text-align: right; color: #666;">Remaining:</td>
                <td style="padding: 10px; text-align: right; color: #f59e0b; font-weight: 500;">${formatCurrency(totalSparePartsCost - paidSparePartsCost)}</td>
                <td style="padding: 10px; text-align: center; color: #000000;"></td>
              </tr>
              ` : ''}
            </tfoot>
          </table>
        </div>
      `
    }

    pageHtml += `
      </div>
    `

    // Generate PDF page from HTML
    try {
      await addPageToPDF(pdf, pageHtml, headerTitle, headerSubtitle, pageIndex === 0, pageIndex + 1, totalPages)
      console.log(`Page ${pageIndex + 1} added successfully`)
    } catch (error) {
      console.error(`Error adding page ${pageIndex + 1}:`, error)
      throw error
    }
  }

  try {
    // Use jsPDF's built-in save method which handles downloads reliably
    // This method properly triggers browser download without trying to open the file
    pdf.save(filename)
    console.log(`PDF generated successfully with ${totalPages} page(s)`)
  } catch (error) {
    console.error("Error saving PDF with save() method:", error)
    // Fallback: use blob approach if save() fails
    try {
      let pdfBlob: Blob
      try {
        // Try blob output first
        pdfBlob = pdf.output('blob') as Blob
      } catch (blobError) {
        // Fallback: create blob from array buffer
        const pdfArrayBuffer = pdf.output('arraybuffer')
        pdfBlob = new Blob([pdfArrayBuffer], { type: 'application/pdf' })
      }
      
      // Create download link with proper attributes
      const url = URL.createObjectURL(pdfBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      link.style.display = 'none'
      link.setAttribute('download', filename)
      link.setAttribute('type', 'application/pdf')
      
      // Append to body
      document.body.appendChild(link)
      
      // Trigger download
      link.click()
      
      // Clean up after download starts
      setTimeout(() => {
        if (link.parentNode) {
          document.body.removeChild(link)
        }
        URL.revokeObjectURL(url)
      }, 500)
      
      console.log(`PDF saved using blob method`)
    } catch (fallbackError) {
      console.error("All PDF save methods failed:", fallbackError)
      throw new Error(`Failed to save PDF: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}

async function addPageToPDF(
  pdf: any,
  pageHtml: string,
  headerTitle: string,
  headerSubtitle: string,
  isFirstPage: boolean,
  currentPage: number,
  totalPages: number
): Promise<void> {
  try {
    // Create isolated element for PDF content
    // A4 size: 210mm × 297mm = 794px × 1123px at 96 DPI
    const isolatedDiv = document.createElement('div')
    const width = 794 // A4 width in pixels at 96 DPI (210mm)
    const height = 1123 // A4 height in pixels at 96 DPI (297mm)

    isolatedDiv.style.cssText = `
    position: fixed;
    left: 0;
    top: 0;
    width: ${width}px;
    min-width: ${width}px;
    max-width: ${width}px;
    height: ${height}px;
    min-height: ${height}px;
    max-height: ${height}px;
    background-color: #ffffff !important;
    color: #000000 !important;
    padding: 30px;
    box-sizing: border-box;
    z-index: 99999;
    overflow: hidden;
    display: block;
    font-family: Arial, sans-serif !important;
  `

    // Template header - appears on EVERY page
    const templateHeader = `
    <div style="position: absolute; top: 20px; left: 30px; right: 30px; z-index: 10; display: flex; justify-content: space-between; align-items: flex-start;">
      <div style="flex: 1;">
        <img src="/icon.svg" alt="LiftOps Logo" style="width: 100px; height: 100px; object-fit: contain;" onerror="this.style.display='none';" />
      </div>
      <div style="flex: 1; text-align: right; color: #000000 !important;">
        <div style="font-weight: 300; font-size: 18px; color: #000000 !important;">${headerTitle}</div>
        <div style="font-weight: 300; font-size: 18px; margin-top: 4px; color: #dc2626 !important;">${headerSubtitle}</div>
      </div>
    </div>
  `

    // Template footer - appears on EVERY page
    const templateFooter = `
    <div style="position: absolute; bottom: 15px; left: 30px; right: 30px; z-index: 10;">
      <div style="display: flex; align-items: flex-end; gap: 12px; margin-bottom: 8px;">
        <img src="/icon.svg" alt="LiftOps Logo" style="width: 100px; height: 100px; object-fit: contain;" onerror="this.style.display='none';" />
        <div style="flex: 1;">
          <div style="border-left: 2px solid #dc2626 !important; padding-left: 12px; padding-top: 12px; padding-bottom: 12px;">
            <div style="font-size: 16px; font-weight: 500; color: #dc2626 !important;">Customer Service</div>
            <div style="display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 300; margin-top: 4px; color: #000000 !important; line-height: 1.5;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2" style="flex-shrink: 0; vertical-align: middle; display: inline-block;"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
              <span style="vertical-align: middle;">01022223207</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 300; margin-top: 4px; color: #000000 !important; line-height: 1.5;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2" style="flex-shrink: 0; vertical-align: middle; display: inline-block;"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
              <span style="vertical-align: middle;">info@liftops.com</span>
            </div>
          </div>
        </div>
        <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 8px; position: relative;">
          <img src="/mhmd.jpeg" alt="Signature" style="width: 250px; height: 75px; object-fit: contain; position: relative; z-index: 1;" onerror="this.style.display='none';" />
          <img src="/liftops-sign.png" alt="Signature" style="width: 120px; height: 110px; object-fit: contain; position: relative; z-index: 3; margin-top: -135px; margin-right: 40px;" onerror="this.style.display='none';" />
        </div>
      </div>
    </div>
  `

    // Build the complete page HTML with template header and footer on EVERY page
    // Content area: top margin for header + bottom margin for footer
    // Header height: 31mm (≈117px) + 1mm margin (≈3.8px) = ~121px
    // Footer height: 80mm (≈302px) + 1mm margin (≈3.8px) = ~306px
    // Available content height: 1123px - 121px - 306px = 696px
    const HEADER_TOTAL_HEIGHT_PX = 121 // Header + margin in pixels
    const FOOTER_TOTAL_HEIGHT_PX = 306 // Footer + margin in pixels
    const CONTENT_TOP_MARGIN_PX = HEADER_TOTAL_HEIGHT_PX
    const CONTENT_BOTTOM_MARGIN_PX = FOOTER_TOTAL_HEIGHT_PX
    
    // Replace images with base64 before inserting HTML
    const fullHtml = `
    ${templateHeader}
    ${templateFooter}
    <div style="margin-top: ${CONTENT_TOP_MARGIN_PX}px; margin-bottom: ${CONTENT_BOTTOM_MARGIN_PX}px; padding: 0 20px; color: #000000 !important; position: relative; z-index: 1; max-height: ${height - CONTENT_TOP_MARGIN_PX - CONTENT_BOTTOM_MARGIN_PX}px; overflow: hidden;">
      ${pageHtml}
    </div>
  `
    
    // Convert images to base64 for production compatibility
    const htmlWithBase64Images = await replaceImagesWithBase64(fullHtml)
    isolatedDiv.innerHTML = htmlWithBase64Images

    document.body.appendChild(isolatedDiv)

    // Wait for ALL images to load (not just the first one)
    const images = isolatedDiv.querySelectorAll('img')
    if (images.length > 0) {
      await Promise.all(
        Array.from(images).map((img) => {
          return new Promise<void>((resolve) => {
            const htmlImg = img as HTMLImageElement
            if (htmlImg.complete && htmlImg.naturalHeight !== 0) {
              // Image already loaded
              resolve()
            } else {
              // Wait for image to load or error
              htmlImg.onload = () => resolve()
              htmlImg.onerror = () => {
                // Even if image fails, continue (fallback already applied)
                resolve()
              }
              // Timeout after 5 seconds per image
              setTimeout(() => resolve(), 5000)
            }
          })
        })
      )
      // Additional delay to ensure rendering
      await new Promise(resolve => setTimeout(resolve, 300))
    } else {
      // No images, just wait a bit for rendering
      await new Promise(resolve => setTimeout(resolve, 200))
    }

    isolatedDiv.offsetHeight

    const canvas = await html2canvas(isolatedDiv, {
      scale: 1.6,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      width: width,
      height: height,
      allowTaint: true,
      windowWidth: width,
      windowHeight: height,
      ignoreElements: (element) => {
        // Ignore elements that might have problematic CSS
        return false
      },
      onclone: (clonedDoc) => {
        // Remove stylesheets that might contain lab() colors
        clonedDoc.querySelectorAll('style, link[rel="stylesheet"]').forEach((el) => {
          el.remove()
        })

        // Handle SVG elements - replace stroke and fill attributes that might contain lab() colors
        const svgElements = clonedDoc.querySelectorAll('svg, svg *')
        svgElements.forEach((svgEl: any) => {
          try {
            // Replace stroke attributes
            const stroke = svgEl.getAttribute('stroke')
            if (stroke && (stroke.includes('lab') || stroke.includes('lch') || stroke.includes('oklab') || stroke.includes('var('))) {
              svgEl.setAttribute('stroke', '#dc2626') // Use red color for strokes
            }

            // Replace fill attributes
            const fill = svgEl.getAttribute('fill')
            if (fill && (fill.includes('lab') || fill.includes('lch') || fill.includes('oklab') || fill.includes('var('))) {
              svgEl.setAttribute('fill', '#dc2626') // Use red color for fills
            }

            // Check style attribute on SVG elements
            const styleAttr = svgEl.getAttribute('style') || ''
            if (styleAttr) {
              let newStyle = styleAttr
                .replace(/stroke:\s*[^;]+lab\([^)]+\)[^;]*;?/gi, 'stroke: #dc2626;')
                .replace(/fill:\s*[^;]+lab\([^)]+\)[^;]*;?/gi, 'fill: #dc2626;')
                .replace(/stroke:\s*var\([^)]+\)[^;]*;?/gi, 'stroke: #dc2626;')
                .replace(/fill:\s*var\([^)]+\)[^;]*;?/gi, 'fill: #dc2626;')
              if (newStyle !== styleAttr) {
                svgEl.setAttribute('style', newStyle)
              }
            }
          } catch (e) {
            // Ignore errors when processing SVG elements
          }
        })

        // Convert any lab() colors to hex/rgb in the cloned document
        const allElements = clonedDoc.querySelectorAll('*')
        allElements.forEach((el: any) => {
          if (el.style) {
            try {
              // Check inline styles for lab() colors
              const styleAttr = el.getAttribute('style') || ''
              if (styleAttr.includes('lab(') || styleAttr.includes('lch(') || styleAttr.includes('oklab(') || styleAttr.includes('var(')) {
                // Remove problematic color functions from style attribute
                let newStyle = styleAttr
                  .replace(/background-color:\s*[^;]+lab\([^)]+\)[^;]*;?/gi, 'background-color: #ffffff;')
                  .replace(/color:\s*[^;]+lab\([^)]+\)[^;]*;?/gi, 'color: #000000;')
                  .replace(/border-color:\s*[^;]+lab\([^)]+\)[^;]*;?/gi, 'border-color: #000000;')
                  .replace(/background-color:\s*var\([^)]+\)[^;]*;?/gi, 'background-color: #ffffff;')
                  .replace(/color:\s*var\([^)]+\)[^;]*;?/gi, 'color: #000000;')
                  .replace(/border-color:\s*var\([^)]+\)[^;]*;?/gi, 'border-color: #000000;')
                el.setAttribute('style', newStyle)
              }

              // Also check computed styles (but be careful as they might throw errors)
              try {
                const computedStyle = window.getComputedStyle(el)
                const bgColor = computedStyle.backgroundColor
                const color = computedStyle.color

                // If color contains 'lab', replace with fallback
                if (bgColor && (bgColor.includes('lab') || bgColor.includes('lch') || bgColor.includes('oklab'))) {
                  el.style.backgroundColor = '#ffffff'
                }
                if (color && (color.includes('lab') || color.includes('lch') || color.includes('oklab'))) {
                  el.style.color = '#000000'
                }
              } catch (e) {
                // Ignore errors when accessing computed styles (element might not be in DOM)
              }
            } catch (e) {
              // Ignore errors when processing element styles
              console.warn('Error processing element styles:', e)
            }
          }
        })
      }
    })

    document.body.removeChild(isolatedDiv)

    // A4 dimensions in mm: 210mm × 297mm
    const a4Width = 210 // mm
    const a4Height = 297 // mm

    // Calculate image dimensions to fit A4 exactly
    // The canvas is rendered at 1.6 scale, so actual canvas size is width*1.6 × height*1.6
    // But we want to fit it to A4 size (210mm × 297mm) in the PDF
    const imgWidth = a4Width
    const imgHeight = a4Height // Always use full A4 height (297mm)

    const imgData = canvas.toDataURL("image/jpeg", 0.85)

    // Add image to PDF at exact A4 size (210mm × 297mm)
    // This ensures each page is exactly A4 size
    try {
      pdf.addImage(imgData, "JPEG", 0, 0, imgWidth, imgHeight, undefined, "FAST")
    } catch (error) {
      console.error("Error adding image to PDF:", error)
      throw new Error(`Failed to add page to PDF: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  } catch (error) {
    console.error("Error in addPageToPDF:", error)
    throw error
  }
}
