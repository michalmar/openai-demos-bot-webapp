// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ActivityHandler, MessageFactory } from 'botbuilder';
import axios, { AxiosResponse, AxiosRequestHeaders } from 'axios';
const { geneFileName, getFileSize, writeFile } = require('../services/fileService');
const path = require('path');
const fs = require('fs');
const FILES_DIR = 'files';

// import { MemoryVectorStore } from "langchain/vectorstores/memory";
// import { OpenAIEmbeddings } from "langchain/embeddings/openai";


export class EchoBot extends ActivityHandler {

    constructor() {
        super();

        interface OpenAiResponse {
            choices: [
                {
                    message: {
                        role: string;
                        content: string;
                    };
                }
            ],
            usage: {
                total_tokens: number;
            }
        }

        

        let conversation_history_dict = {};
        let messages_init = {"role":"system", "content": "As an advanced chatbot, your primary goal is to assist users to the best of your ability. This may involve answering questions, providing helpful information, or completing tasks based on user input. In order to effectively assist users, it is important to be detailed and thorough in your responses. Use examples and evidence to support your points and justify your recommendations or solutions."};

        // this is the url for the openai api
        const url = process.env.OPENAI_API_URL

        // number of turns (user messages) to keep in the conversation history
        const history_length = 3
        
        const headers = {
        'Content-Type': 'application/json',
        // 'Authorization': 'Bearer YOUR_TOKEN'
        'api-key': process.env.OPENAI_API_KEY
        }


        async function postDataToEndpoint(url: string, requestBody: string, headers: AxiosRequestHeaders): Promise<OpenAiResponse> {
            try {
              const response: AxiosResponse = await axios.post(url, requestBody, {headers});
              return response.data;
            } catch (error) {
              throw new Error(`Error posting data to ${url}: ${error}`);
            }
        }

        // function that iterates through the conversation history and counts number of occurance "user" messages
        function count_user_messages(conversation_history_array: any) {
            let count = 0;
            for (let i = 0; i < conversation_history_array.length; i++) {
                if (conversation_history_array[i].role == "user") {
                    count = count + 1;
                }
            }
            return count;
        }


        // See https://aka.ms/about-bot-activity-message to learn more about the message and other activity types.
        this.onMessage(async (context, next) => {

            const attachments = context.activity.attachments;
            const imageRegex = /image\/.*/;
            console.log("attachments: "+attachments[0].contentType)
            if (attachments && attachments[0] && attachments[0].contentType === 'application/vnd.microsoft.teams.file.download.info') {
                const file = attachments[0];
                const config = {
                    responseType: 'stream'
                };
                const filePath = path.join(FILES_DIR, file.name);
                await writeFile(file.content.downloadUrl, config, filePath);
                const reply = MessageFactory.text(`<b>${ file.name }</b> received and saved.`);
                reply.textFormat = 'xml';
                await context.sendActivity(reply);
            //} else if (attachments && attachments[0] && attachments[0].contentType === 'application/pdf') {
            
            // handling text files
            } else if (attachments && attachments[0] && attachments[0].contentType === 'text/plain') {
                const file = attachments[0];
                const filePath = path.join(FILES_DIR, file.name);
                const config = {
                    responseType: 'stream'
                };
                // write file to disk
                await writeFile(file.contentUrl, config, filePath);
                // read file from disk
                const fileContent = await fs.promises.readFile(filePath, 'utf-8');
                // send file content to user
                await context.sendActivity(MessageFactory.text("FileText: "+fileContent));
            
            // handling images
            } else if (attachments && attachments[0] && imageRegex.test(attachments[0].contentType)) {
                await this.processInlineImage(context);
            } else {
                // const filename = 'teams-logo.png';
                // const stats = fs.statSync(path.join(FILES_DIR, filename));
                // const fileSize = stats.size;
                // await this.sendFileCard(context, filename, fileSize);
                await context.sendActivity(MessageFactory.text("Just text: "+context.activity.text));

            }


            // // check if user input is "/reset"
            // if (context.activity.text == "/reset") {
            //     // reset conversation history
            //     conversation_history_dict[context.activity.conversation.id] = []
            //     // send response to user
            //     await context.sendActivity(MessageFactory.text("Clearing session. Starting with new context - just ask your question."));
                
            //     // By calling next() you ensure that the next BotHandler is run.
            //     await next();
            // } else {
            //     //construct conversation history from conversation_history_array
            //     // conversation_history_dict structure:
            //     // {conversation_id: [{"role":"system", "content":"..."}
            //     //                      , {"role":"user", "content":"..."}
            //     //                     , {"role":"assistant", "content":"..."}
            //     //                     , ...]
            //     let tmp_conversation_history = ""
            //     conversation_history_dict[context.activity.conversation.id] ??= [messages_init];
            //     let conversation_history_array = conversation_history_dict[context.activity.conversation.id];
                
            //     // check if conversation history is not larger than history_length, if so remove from begining
            //     if (count_user_messages(conversation_history_array) > history_length) {
            //         console.log("history too long - removing first element")
            //         let N = 2; // removing two elements (question and answer)
            //         for (let i = 0; i < N; i++) {
            //             conversation_history_array.shift(); // remove the first element from the array
            //         }
            //         // make sure that the first element is always the initial message (system message)
            //         conversation_history_array[0] = messages_init;
            //     }
                
            //     // add the user input to the conversation history
            //     conversation_history_array.push({"role":"user", "content":context.activity.text});
             

            //     let reqBody = JSON.stringify({
            //         "messages": conversation_history_array,
            //         "max_tokens": 1500,
            //         "temperature": 0.7,
            //         "frequency_penalty": 0,
            //         "presence_penalty": 0,
            //         "top_p": 1,
            //         "stop": null
            //       });

            //     try {
            //         // send request to openai
            //         const data = await postDataToEndpoint(url, reqBody, headers);

            //         // add the chatbot response to the conversation history
            //         conversation_history_array.push({"role":data.choices[0].message.role, "content":data.choices[0].message.content});   
                    
            //         // update conversation history
            //         conversation_history_dict[context.activity.conversation.id] = conversation_history_array;

            //         // send response to user
            //         const replyText = `${ data.choices[0].message.content } \n[~  ${data.usage.total_tokens} tokens in ${conversation_history_array.length} turns]`;
            //         // const replyText = `Echox: ${ context.activity.text } value: ${ context.activity.value }`;
            //         await context.sendActivity(MessageFactory.text(replyText));
                    
            //         // By calling next() you ensure that the next BotHandler is run.
            //         await next();
            //     } catch (error) {
            //         console.log(error);
            //         await context.sendActivity(MessageFactory.text(`${error} - try again later!`));
            //         await next();
            //     }
            // }
        });

        this.onMembersAdded(async (context, next) => {
            const membersAdded = context.activity.membersAdded;
            const welcomeText = 'Hi, this is ChatGPT model! How can I help you?';
            
            for (const member of membersAdded) {
                if (member.id !== context.activity.recipient.id) {
                    await context.sendActivity(MessageFactory.text(welcomeText, welcomeText));
                    conversation_history_dict[context.activity.conversation.id] = [messages_init];
                }
            }
            // By calling next() you ensure that the next BotHandler is run.
            await next();
        });

        async function getFileFromRequestAndReadAsText(context): Promise<string> {
            if (context.activity.attachments && context.activity.attachments.length > 0) {
                const attachment = context.activity.attachments[0];
                const filePath = path.join(FILES_DIR, attachment.name);
    
                // Assuming the attachment.contentUrl contains the file data
                await fs.promises.writeFile(filePath, attachment.contentUrl, 'base64');
    
                const fileContent = await fs.promises.readFile(filePath, 'utf-8');
                
                return fileContent;
            } else {
                throw new Error('No attachments found in the request');
            }
        }

    }

    async processInlineImage(context) {
        const file = context.activity.attachments[0];
        // const credentials = new MicrosoftAppCredentials(process.env.MicrosoftAppId, process.env.MicrosoftAppPassword);
        // const botToken = await credentials.getToken();
        // const config = {
        //     headers: { Authorization: `Bearer ${ botToken }` },
        //     responseType: 'stream'
        // };
        // const fileName = await geneFileName(FILES_DIR);
        // const filePath = path.join(FILES_DIR, fileName);
        // await writeFile(file.contentUrl, config, filePath);
        // const fileSize = await getFileSize(filePath);
        // const reply = MessageFactory.text(`Image <b>${ fileName }</b> of size <b>${ fileSize }</b> bytes received and saved.`);
        // const inlineAttachment = this.getInlineAttachment(fileName);
        // reply.attachments = [inlineAttachment];
        let reply = "Recieved file...";
        await context.sendActivity(reply);
    }



    getInlineAttachment(fileName:string) {
        const imageData = fs.readFileSync(path.join(FILES_DIR, fileName));
        const base64Image = Buffer.from(imageData).toString('base64');
        return {
            name: fileName,
            contentType: 'image/png',
            contentUrl: `data:image/png;base64,${ base64Image }`
        };
    }

    a
}
