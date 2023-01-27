// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ActivityHandler, MessageFactory } from 'botbuilder';
import axios, { AxiosResponse, AxiosRequestHeaders } from 'axios';

export class EchoBot extends ActivityHandler {
    constructor() {
        super();

        interface RequestBody {
            prompt: string;
            max_tokens: number;
            // temperature: string;
            // presence_penalty: string;
            // frequency_penalty: string;

        }

        interface OpenAiResponse {
            choices: [
                {
                    text: string;
                }
            ]
        }

        let prompt = `
        As an advanced chatbot, your primary goal is to assist users to the best of your ability. This may involve answering questions, providing helpful information, or completing tasks based on user input. In order to effectively assist users, it is important to be detailed and thorough in your responses. Use examples and evidence to support your points and justify your recommendations or solutions.

        <conversation history>

        User: <user input>
        Chatbot:
        `

        let conversation_history = ""
        
        const headers = {
        'Content-Type': 'application/json',
        // 'Authorization': 'Bearer YOUR_TOKEN'
        'api-key': 'cc3fd4239a5e49419ab55210bd664d98'
        }


        async function postDataToEndpoint(url: string, requestBody: RequestBody, headers: AxiosRequestHeaders): Promise<OpenAiResponse> {
            try {
              const response: AxiosResponse = await axios.post(url, requestBody, {headers});
              return response.data;
            } catch (error) {
              throw new Error(`Error posting data to ${url}: ${error}`);
            }
        }



        // See https://aka.ms/about-bot-activity-message to learn more about the message and other activity types.
        this.onMessage(async (context, next) => {

            const url = "https://mma-openai.openai.azure.com/openai/deployments/text-davinci-003/completions?api-version=2022-12-01"
       
            let tmp_prompt = prompt.replace("<conversation history>", conversation_history).replace("<user input>", context.activity.text)
            const requestBody =     {
                prompt: tmp_prompt
                , max_tokens: 100
                // , temperature: "1.0"
                // , presence_penalty: "0.0"
                // , frequency_penalty: "0.0"
            };
            const data = await postDataToEndpoint(url, requestBody, headers);

            // console.log(data.choices[0].text);

            conversation_history = conversation_history + "User: " + context.activity.text + "\nChatbot: " + data.choices[0].text + "\n"
           
            const replyText = `AOAI: ${ data.choices[0].text }`;
            // const replyText = `Echox: ${ context.activity.text }`;
            await context.sendActivity(MessageFactory.text(replyText, replyText));
            // By calling next() you ensure that the next BotHandler is run.
            await next();
        });

        this.onMembersAdded(async (context, next) => {
            const membersAdded = context.activity.membersAdded;
            const welcomeText = 'Hello and welcome!';
            for (const member of membersAdded) {
                if (member.id !== context.activity.recipient.id) {
                    await context.sendActivity(MessageFactory.text(welcomeText, welcomeText));
                }
            }
            // By calling next() you ensure that the next BotHandler is run.
            await next();
        });
    }
}
