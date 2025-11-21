# **Gemini 3 Pro Image API (Nano Banana Pro) – The Definitive Developer Guide**

Model ID: gemini-3-pro-image-preview  
Codename: Nano Banana Pro  
Core Architecture: Gemini 3 Pro Reasoning Engine  
This guide unifies technical specifications, enterprise best practices, and complete implementation details for Google's most advanced image generation and editing model.

## **Table of Contents**

1. [Strategic Overview](https://www.google.com/search?q=%231-strategic-overview)  
2. [Technical Specifications & Limits](https://www.google.com/search?q=%232-technical-specifications--limits)  
3. [Authentication & Endpoints](https://www.google.com/search?q=%233-authentication--endpoints)  
4. [Core Generation Features](https://www.google.com/search?q=%234-core-generation-features)  
   * [Resolution & Aspect Ratios](https://www.google.com/search?q=%23resolution--aspect-ratios)  
   * [Person Generation & Safety](https://www.google.com/search?q=%23person-generation--safety)  
5. [Advanced Workflows](https://www.google.com/search?q=%235-advanced-workflows)  
   * [Thinking Mode](https://www.google.com/search?q=%23thinking-mode)  
   * [Reference Images & Consistency](https://www.google.com/search?q=%23reference-images--consistency)  
   * [Multi-Turn Editing & thoughtSignatures](https://www.google.com/search?q=%23multi-turn-editing--thoughtsignatures)  
   * [Google Search Grounding](https://www.google.com/search?q=%23google-search-grounding)  
6. [Data Handling: Inline vs. File API](https://www.google.com/search?q=%236-data-handling-inline-vs-file-api)  
7. [Commercial & Pricing](https://www.google.com/search?q=%237-commercial--pricing)  
8. [Error Handling & Rate Limits](https://www.google.com/search?q=%238-error-handling--rate-limits)  
9. [Complete Code Examples (Python & TypeScript)](https://www.google.com/search?q=%239-complete-code-examples-python--typescript)  
10. [Resources & API Reference](https://www.google.com/search?q=%2310-resources--api-reference)

## **1\. Strategic Overview**

**Gemini 3 Pro Image** (aka "Nano Banana Pro") is built on the **Gemini 3 Pro reasoning foundation**, allowing it to "reason" through complex spatial and logical prompts, render legible text, and maintain state across multi-turn editing sessions.

### **Key Differentiators**

* **Text Rendering:** Superior capability to generate legible, spelled-correctly text (logos, signs, long paragraphs) in multiple languages.  
* **High Fidelity:** Native support for professional, production-ready resolutions up to **4K** (Ultra High Definition).  
* **Reasoning:** Uses the Gemini 3 logic core to understand spatial relationships and complex instructions, resulting in more coherent, well-reasoned outputs.  
* **Availability:** Exclusively available via the **Global endpoint** only (no specific regional endpoints).

### **Migration and Lifecycle**

Older image models (e.g., gemini-2.0-flash-preview-image-generation, gemini-2.5-flash-image-preview) are scheduled for retirement on **October 31, 2025**. Production workloads relying on multi-turn editing, high-fidelity output, or advanced reasoning must migrate to gemini-3-pro-image-preview.

## **2\. Technical Specifications & Limits**

| Feature | Specification | Impact on Development |
| :---- | :---- | :---- |
| **Model ID** | gemini-3-pro-image-preview | The required identifier for API calls. |
| **Input Token Limit** | 65,536 tokens | Max length for system instructions and prompts. |
| **Output Token Limit** | 32,768 tokens | Applies to generated text metadata and thoughtSignatures. |
| **Max Input Images** | 14 images | Combined limit for reference images (style/character). |
| **Max Single Image File Size** | 7 MB | Hard constraint for individual input files. |
| **Request Payload Limit** | \< 20 MB | **Critical:** Use File API if Base64 payload exceeds 20MB. |
| **Supported Output** | 1K, 2K, 4K | Costs vary significantly by resolution. |
| **Supported MIME** | PNG, JPEG, WEBP, HEIC, HEIF | Defines acceptable input formats. |

## **3\. Authentication & Endpoints**

### **Endpoints**

* **Gemini API (REST):** https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent  
* **Vertex AI:** https://us-central1-aiplatform.googleapis.com/v1/projects/{PROJECT\_ID}/locations/us-central1/publishers/google/models/gemini-3-pro-image-preview:generateContent

### **Setup (Python & TypeScript)**

**Python (google-genai SDK):**  
import os  
from google import genai

\# Client Setup  
client \= genai.Client(api\_key=os.environ.get("GEMINI\_API\_KEY"))  
MODEL\_ID \= "gemini-3-pro-image-preview"

**TypeScript (@google/genai SDK):**  
import { GoogleGenAI } from "@google/genai";

const ai \= new GoogleGenAI({ apiKey: process.env.GEMINI\_API\_KEY });  
const model \= 'gemini-3-pro-image-preview';

## **4\. Core Generation Features**

### **Resolution & Aspect Ratios**

Resolution is specified using the imageSize parameter, and must be in uppercase.

* **Resolutions (Use Uppercase):** 1K, 2K, 4K  
* **Aspect Ratios:** 1:1, 9:16, 16:9, 3:4, 4:3, 3:2, 2:3, 5:4, 4:5, 21:9  
* **Output Quantity:** numberOfImages (1 to 4 candidates, default is 4).

**Configuration Code Snippet:**  
"imageConfig": {  
    "imageSize": "4K",   
    "aspectRatio": "16:9",  
    "numberOfImages": 4  
}

### **Person Generation & Safety**

Use personGeneration to control the generation of human subjects. This is a critical, explicit safety layer.

| Setting | Description |
| :---- | :---- |
| ALLOW\_ADULT | Only adult faces (Default). |
| ALLOW\_ALL | All people including children. |
| DONT\_ALLOW | Hard block on generating people (Best for strict compliance). |

**Watermarking (SynthID):** By default, **SynthID** (invisible watermarking) is enabled (addWatermark: true) to identify AI-generated content.

### **Negative Prompts**

Specify what the model should **not** include in the image using the negativePrompt parameter in imageConfig.  
**Common Examples:** "blurry, low quality, watermark, text, logo, distorted, deformed"

## **5\. Advanced Workflows**

### **Thinking Mode**

Gemini 3 Pro Image utilizes a complex "thinking process" (similar to Chain-of-Thought) for all generations. This process is **always enabled** and generates up to 2 internal "thought images" before producing the final result, improving coherence and adherence to complex spatial instructions.

### **Reference Images & Consistency**

You can provide up to **14 reference images** to guide the style, composition, or content.

* **Character Consistency:** Max **5 distinct characters (people)** can have their identity and appearance consistently maintained across different scenes.  
* **Object Composition:** Max **6 distinct objects** can be referenced with high fidelity.

### **Multi-Turn Editing & thoughtSignatures**

Multi-turn editing is a **stateful** process. The model requires the context of the previous generation to perform logical, iterative refinements.

* **State Management:** When the model generates an image, it returns a **thoughtSignature** in the response metadata.  
* **Mandatory Re-submission:** To perform a follow-up edit (e.g., "now make it night time"), you **must** extract this signature and send it back in the next request along with the prompt and the reference image (Base64 or File API reference).  
* **Result of Omission:** Without the signature, the model treats the request as a brand new prompt, losing the context of the original composition.

### **Google Search Grounding**

The model can use Google Search to ground generations in current, factual, real-time data (e.g., "Visualize the current weather in Tokyo").

* **Enablement:** Include the tool in the configuration: tools: \[{ googleSearch: {} }\]  
* **Cost Implication:** Grounding queries incur separate costs (approx. $14 per 1,000 queries) after the initial 5,000 free monthly queries.

## **6\. Data Handling: Inline vs. File API**

Managing input image data is crucial due to payload limits.

1. **Inline Image Data (Base64):**  
   * **Use for:** Single, small reference images.  
   * **Limit:** The total request payload (text \+ Base64 images) must be **\< 20 MB**.  
   * **Risk:** Highly prone to 413 Payload Too Large errors when using multiple or large input images.  
2. **Uploading Images using the File API (Recommended for Enterprise):**  
   * **Use for:** Multiple reference images (up to 14), high-res inputs, or consistency workflows.  
   * **Method:** Upload the file via a separate API call first to get a file URI, then pass that URI in the generateContent request.  
   * **Limit:** Handles individual files up to **7 MB**.

## **7\. Commercial & Pricing**

Pricing is granular and resolution-dependent, requiring a calculated cost optimization strategy.

| Cost Component | Model ID | Rate (Est.) | Optimization Strategy |
| :---- | :---- | :---- | :---- |
| **Text Input** | gemini-3-pro-image-preview | $2.00 / 1M tokens | Minimize verbose system prompts. |
| **Image Output** | gemini-3-pro-image-preview | \~$0.134 / image\*\* | **Varies by resolution (4K costs significantly more).** |
| **Search Grounding** | Gemini 3 Pro Suite | $14.00 / 1k queries | Implement throttling/caching; applies after 5,000 free queries/month. |

### **Advanced Cost Optimization Strategy**

Implement a **tiered generation architecture**:

* Use 1K or 2K resolution for internal drafting, iterative editing, and low-priority tasks.  
* Strictly reserve the highest-cost 4K generation only for the final, commercially necessary assets (e.g., print media, client delivery).

## **8\. Error Handling & Rate Limits**

### **Common Errors and Troubleshooting**

| HTTP Code | Status | Issue | Solution |
| :---- | :---- | :---- | :---- |
| **400** | INVALID\_ARGUMENT | Malformed request, wrong parameter type (e.g., imagesize should be imageSize: "4K"). | Check prompt/parameters for correct case and type. |
| **403** | PERMISSION\_DENIED | API Key issue or project permissions. | Verify API key and billing setup. |
| **404** | NOT\_FOUND | Model ID wrong or File API reference non-existent. | Ensure gemini-3-pro-image-preview is spelled correctly. |
| **413** | PAYLOAD\_TOO\_LARGE | Request \> 20MB (Base64 limit). | Switch input image handling to the **File API**. |
| **429** | RESOURCE\_EXHAUSTED | Rate limit exceeded. | Implement exponential backoff and request queueing. |
| **500/503** | INTERNAL / UNAVAILABLE | Service overload or internal error. | Retry using exponential backoff. |
| **Block** | SAFETY | Content violation. | Check finishReason. Adjust prompt. |

### **Rate Limits**

| Tier | Requests/Minute (RPM) | Requests/Day |
| :---- | :---- | :---- |
| Free | 15 | 1,500 |
| Pay-as-you-go | 1,000 | 30,000 |

## **9\. Complete Code Examples (Python & TypeScript)**

### **TypeScript: Full-Featured Image Generator Class**

This class demonstrates how to handle all major configuration options, including references and editing.  
import { GoogleGenAI, Modality } from "@google/genai";

// Types  
type ImageSize \= '1K' | '2K' | '4K';  
type AspectRatio \= '1:1' | '9:16' | '16:9' | '3:4' | '4:3' | '3:2' | '2:3' | '5:4' | '4:5' | '21:9';

interface ImageGenerationOptions {  
    aspectRatio?: AspectRatio;  
    imageSize?: ImageSize;  
    numberOfImages?: 1 | 2 | 3 | 4;  
    personGeneration?: 'ALLOW\_ADULT' | 'ALLOW\_ALL' | 'DONT\_ALLOW';  
    negativePrompt?: string;  
    addWatermark?: boolean;  
    useGoogleSearch?: boolean;  
}

interface ReferenceImage {  
    data: string; // Base64 encoded  
    mimeType: string;  
}

interface GenerationResult {  
    images: string\[\];  
    metadata: {  
        prompt: string;  
        options: ImageGenerationOptions;  
        duration: number;  
    };  
}

class GeminiImageGenerator {  
    private ai: GoogleGenAI;  
    private model \= 'gemini-3-pro-image-preview';

    constructor(apiKey: string) {  
        this.ai \= new GoogleGenAI({ apiKey });  
    }

    async generate(  
        prompt: string,  
        options: ImageGenerationOptions \= {},  
        references: ReferenceImage\[\] \= \[\]  
    ): Promise\<GenerationResult\> {  
        const startTime \= Date.now();

        const parts: any\[\] \= \[\];

        // 1\. Add reference images  
        references.forEach(ref \=\> {  
            parts.push({  
                inlineData: { data: ref.data, mimeType: ref.mimeType }  
            });  
        });

        // 2\. Build prompt  
        let fullPrompt \= prompt;  
        if (references.length \> 0\) {  
            fullPrompt \= \`Using the ${references.length} reference image(s) for style guidance: ${prompt}\`;  
        }  
        parts.push({ text: fullPrompt });

        // 3\. Build config  
        const config: any \= {  
            responseModalities: \[Modality.IMAGE\],  
            imageConfig: {}  
        };

        Object.assign(config.imageConfig, options);

        if (options.useGoogleSearch) {  
            config.tools \= \[{ googleSearch: {} }\];  
        }

        // 4\. Make request and handle errors/safety  
        const response \= await this.ai.models.generateContent({  
            model: this.model,  
            contents: \[{ role: 'user', parts }\],  
            config  
        });

        // Extract images  
        const images: string\[\] \= \[\];  
        for (const candidate of response.candidates || \[\]) {  
            if (candidate.finishReason \=== 'SAFETY') {  
                throw new Error('Content blocked by safety filters');  
            }  
            for (const part of candidate.content?.parts || \[\]) {  
                if (part.inlineData?.mimeType?.startsWith('image/')) {  
                    images.push(  
                        \`data:${part.inlineData.mimeType};base64,${part.inlineData.data}\`  
                    );  
                }  
            }  
        }

        if (images.length \=== 0\) {  
            throw new Error('No images generated or response structure unexpected');  
        }

        return {  
            images,  
            metadata: {  
                prompt,  
                options,  
                duration: Date.now() \- startTime  
            }  
        };  
    }  
      
    // Example for Image Editing (requires pre-generated Base64 of the image)  
    async edit(  
        imageBase64: string,  
        mimeType: string,  
        editPrompt: string,  
        options: ImageGenerationOptions \= {}  
    ): Promise\<GenerationResult\> {  
        const startTime \= Date.now();

        const parts \= \[  
            {  
                inlineData: {  
                    data: imageBase64,  
                    mimeType: mimeType  
                }  
            },  
            { text: \`Edit this image: ${editPrompt}\` }  
        \];

        const config: any \= {  
            responseModalities: \[Modality.IMAGE\],  
            imageConfig: {}  
        };  
        Object.assign(config.imageConfig, options);

        const response \= await this.ai.models.generateContent({  
            model: this.model,  
            contents: \[{ role: 'user', parts }\],  
            config  
        });  
          
        // ... (Image extraction logic similar to generate) ...

        const images: string\[\] \= \[\];  
        for (const candidate of response.candidates || \[\]) {  
            for (const part of candidate.content?.parts || \[\]) {  
                if (part.inlineData?.mimeType?.startsWith('image/')) {  
                    images.push(  
                        \`data:${part.inlineData.mimeType};base64,${part.inlineData.data}\`  
                    );  
                }  
            }  
        }

        return {  
            images,  
            metadata: {  
                prompt: editPrompt,  
                options,  
                duration: Date.now() \- startTime  
            }  
        };  
    }  
}

### **Python: Advanced Generation and Editing Flow**

This example illustrates a full flow, including basic generation and a follow-up editing step using image bytes.  
import os  
import time  
import google.genai as genai  
from google.genai import types

\# Assumes GEMINI\_API\_KEY is set in environment  
client \= genai.Client(api\_key=os.environ.get("GEMINI\_API\_KEY"))  
MODEL\_ID \= "gemini-3-pro-image-preview"

def generate\_advanced\_image():  
    \# 1\. Initial Generation Step (Using 2K resolution)  
    print("Generating initial image...")  
    response \= client.models.generate\_content(  
        model=MODEL\_ID,  
        contents="A cyberpunk detective office, neon rain outside window, high detail",  
        config=types.GenerateContentConfig(  
            \# Request IMAGE and TEXT to ensure we capture any thoughtSignatures or metadata  
            response\_modalities=\['IMAGE', 'TEXT'\],  
            image\_config=types.ImageConfig(  
                image\_size="2K",  
                aspect\_ratio="16:9",  
                person\_generation="ALLOW\_ADULT",  
                add\_watermark=True  
            )  
        )  
    )

    \# Extract Image Bytes and potentially the thought\_signature  
    initial\_image\_bytes \= None  
    thought\_signature \= None

    for part in response.candidates\[0\].content.parts:  
        if part.inline\_data:  
            initial\_image\_bytes \= part.inline\_data.data  
        \# NOTE: Signature location depends on exact API response structure.   
        \# Production code must parse metadata for state continuity.  
        if hasattr(part, 'thought\_signature'):   
             thought\_signature \= part.thought\_signature 

    if not initial\_image\_bytes:  
        raise Exception("No image generated")  
      
    \# Save Initial Image  
    with open("output\_1\_initial.png", "wb") as f:  
        f.write(initial\_image\_bytes)  
      
    \# 2\. Editing Step (Multi-Turn Refinement)  
    \# The image bytes are used as the new reference input  
    print("Editing image...")  
      
    \# Building the contents array for the editing turn:  
    \# 1\. The input image (required for editing)  
    \# 2\. The thoughtSignature (required for stateful editing \- needs to be added if available)  
    \# 3\. The editing prompt  
      
    edit\_contents \= \[  
        types.Part.from\_bytes(data=initial\_image\_bytes, mime\_type="image/png"),  
        "Make it day time instead of night time, change the neon to warm sunlight."  
    \]  
      
    \# If a signature was found, include it for continuity  
    if thought\_signature:  
        edit\_contents.insert(1, types.Part.from\_text(f"ThoughtSignature: {thought\_signature}"))

    edit\_response \= client.models.generate\_content(  
        model=MODEL\_ID,  
        contents=edit\_contents,  
        config=types.GenerateContentConfig(  
             response\_modalities=\['IMAGE'\]  
        )  
    )  
      
    \# Save Edited Image  
    for part in edit\_response.candidates\[0\].content.parts:  
        if part.inline\_data:  
            with open("output\_2\_edited.png", "wb") as f:  
                f.write(part.inline\_data.data)

if \_\_name\_\_ \== "\_\_main\_\_":  
    generate\_advanced\_image()

## **10\. Resources & API Reference**

### **Quick Reference Card**

| Parameter | Type/Value | Description |
| :---- | :---- | :---- |
| model | gemini-3-pro-image-preview | The required model ID. |
| imageSize | 1K | 2K |
| aspectRatio | 1:1... 21:9 | Output canvas shape. |
| numberOfImages | 1 | 2 |
| personGeneration | ALLOW\_ADULT...DONT\_ALLOW | Explicit control over generating people. |
| negativePrompt | string | Text describing what to avoid. |
| tools | \[{ googleSearch: {} }\] | Enables real-time factual grounding. |

### **API Endpoints**

| Platform | Endpoint | Use Case |
| :---- | :---- | :---- |
| **Gemini API** | POST /models/gemini-3-pro-image-preview:generateContent | API Key Authentication |
| **Vertex AI** | POST /projects/{PROJECT\_ID}/locations/us-central1/publishers/google/models/gemini-3-pro-image-preview:generateContent | OAuth 2.0 / Enterprise |

### **Official Google Documentation**

* **Gemini 3 Developer Guide:** https://ai.google.dev/gemini-api/docs/gemini-3  
* **Image Generation with Gemini:** https://ai.google.dev/gemini-api/docs/image-generation  
* **Vertex AI Model Garden:** https://console.cloud.google.com/vertex-ai/publishers/google/model-garden/gemini-3-pro-image-preview  
* **Pricing:** https://cloud.google.com/vertex-ai/generative-ai/pricing  
* **Safety Settings:** https://ai.google.dev/gemini-api/docs/safety-settings