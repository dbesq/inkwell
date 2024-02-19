import { db } from "@/db";
import { SendMessageValidator } from "@/lib/validators/SendMessageValidator";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { PineconeStore } from '@langchain/pinecone'
import { pinecone } from "@/lib/pinecone"
import { NextRequest } from "next/server";
import { openai } from "@/lib/openai";
import { OpenAIStream, StreamingTextResponse } from 'ai'

export const POST = async (req: NextRequest) => {
    // endpoint f/ asking a question to PDF file
    const body = await req.json()

    const { getUser } = await getKindeServerSession()
    const user: any = await getUser()

    const { id: userId } = user

    if (!userId) {
        return new Response('Unauthorized', { status: 401 })
    }

    const { fileId, message } = SendMessageValidator.parse(body)

    const file = await db.file.findFirst({
        where: {
            id: fileId,
            userId
        }
    })

    if (!file) {
        return new Response('Not found', { status: 404 })
    }

    await db.message.create({
        data: {
            text: message,
            isUserMessage: true,
            userId,
            fileId,
        }
    })

    // 1.  Vectorize message
    const pineconeIndex = pinecone.Index('inkwell')

    const embeddings = new OpenAIEmbeddings({
        openAIApiKey: process.env.OPENAI_API_KEY
    })

    const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
        pineconeIndex,
    })

    const results = await vectorStore.similaritySearch(message, 4)

    // Get previous messages in chat
    const prevMessages = await db.message.findMany({
        where: {
            fileId
        },
        orderBy: {
            createdAt: 'asc'
        },
        take: 6
    })

    // Format f/ OpenAI
    const formattedPrevMessages = prevMessages.map((msg) => ({
        role: msg.isUserMessage ? 'user' as const : 'assistant' as const,
        content: msg.text
    }))

    const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        temperature: 0,
        stream: true,
        messages: [
            {
                role: 'system',
                content:
                    'Use the following pieces of context (or previous conversaton if needed) to answer the users question in markdown format.',
            },
            {
                role: 'user',
                content: `Use the following pieces of context (or previous conversaton if needed) to answer the users question in markdown format. \nIf you don't know the answer, just say that you don't know, don't try to make up an answer.
              
        \n----------------\n
        
        PREVIOUS CONVERSATION:
        ${formattedPrevMessages.map((message) => {
                    if (message.role === 'user') return `User: ${message.content}\n`
                    return `Assistant: ${message.content}\n`
                })}
        
        \n----------------\n
        
        CONTEXT:
        ${results.map((r) => r.pageContent).join('\n\n')}
        
        USER INPUT: ${message}`,
            },
        ],
    })

    // Cant use trpc - need custom route
    const stream = OpenAIStream(response, {
        async onCompletion(completion) {
            await db.message.create({
                data: {
                    text: completion,
                    isUserMessage: false,
                    fileId,
                    userId
                }
            })
        }
    })

    return new StreamingTextResponse(stream)
}