"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EchoBot = void 0;
const botbuilder_1 = require("botbuilder");
const axios_1 = require("axios");
class EchoBot extends botbuilder_1.ActivityHandler {
    constructor() {
        super();
        let conversation_history_dict = {};
        let messages_init = { "role": "system", "content": "As an advanced chatbot, your primary goal is to assist users to the best of your ability. This may involve answering questions, providing helpful information, or completing tasks based on user input. In order to effectively assist users, it is important to be detailed and thorough in your responses. Use examples and evidence to support your points and justify your recommendations or solutions." };
        // this is the url for the openai api
        const url = process.env.OPENAI_API_URL;
        // number of turns (user messages) to keep in the conversation history
        const history_length = 3;
        const headers = {
            'Content-Type': 'application/json',
            // 'Authorization': 'Bearer YOUR_TOKEN'
            'api-key': process.env.OPENAI_API_KEY
        };
        function postDataToEndpoint(url, requestBody, headers) {
            return __awaiter(this, void 0, void 0, function* () {
                try {
                    const response = yield axios_1.default.post(url, requestBody, { headers });
                    return response.data;
                }
                catch (error) {
                    throw new Error(`Error posting data to ${url}: ${error}`);
                }
            });
        }
        // function that iterates through the conversation history and counts number of occurance "user" messages
        function count_user_messages(conversation_history_array) {
            let count = 0;
            for (let i = 0; i < conversation_history_array.length; i++) {
                if (conversation_history_array[i].role == "user") {
                    count = count + 1;
                }
            }
            return count;
        }
        // See https://aka.ms/about-bot-activity-message to learn more about the message and other activity types.
        this.onMessage((context, next) => __awaiter(this, void 0, void 0, function* () {
            // check if user input is "/reset"
            if (context.activity.text == "/reset") {
                // reset conversation history
                conversation_history_dict[context.activity.conversation.id] = [];
                // send response to user
                yield context.sendActivity(botbuilder_1.MessageFactory.text("Clearing session. Starting with new context - just ask your question."));
                // By calling next() you ensure that the next BotHandler is run.
                yield next();
            }
            else {
                //construct conversation history from conversation_history_array
                // conversation_history_dict structure:
                // {conversation_id: [{"role":"system", "content":"..."}
                //                      , {"role":"user", "content":"..."}
                //                     , {"role":"assistant", "content":"..."}
                //                     , ...]
                let tmp_conversation_history = "";
                let conversation_history_array = conversation_history_dict[context.activity.conversation.id];
                // check if conversation history is not larger than history_length, if so remove from begining
                if (count_user_messages(conversation_history_array) > history_length) {
                    console.log("history too long - removing first element");
                    let N = 2; // removing two elements (question and answer)
                    for (let i = 0; i < N; i++) {
                        conversation_history_array.shift(); // remove the first element from the array
                    }
                    // make sure that the first element is always the initial message (system message)
                    conversation_history_array[0] = messages_init;
                }
                // add the user input to the conversation history
                conversation_history_array.push({ "role": "user", "content": context.activity.text });
                let reqBody = JSON.stringify({
                    "messages": conversation_history_array,
                    "max_tokens": 1500,
                    "temperature": 0.7,
                    "frequency_penalty": 0,
                    "presence_penalty": 0,
                    "top_p": 1,
                    "stop": null
                });
                try {
                    // send request to openai
                    const data = yield postDataToEndpoint(url, reqBody, headers);
                    // add the chatbot response to the conversation history
                    conversation_history_array.push({ "role": data.choices[0].message.role, "content": data.choices[0].message.content });
                    // update conversation history
                    conversation_history_dict[context.activity.conversation.id] = conversation_history_array;
                    // send response to user
                    const replyText = `${data.choices[0].message.content} \n[~  ${data.usage.total_tokens} tokens in ${conversation_history_array.length} turns]`;
                    // const replyText = `Echox: ${ context.activity.text } value: ${ context.activity.value }`;
                    yield context.sendActivity(botbuilder_1.MessageFactory.text(replyText));
                    // By calling next() you ensure that the next BotHandler is run.
                    yield next();
                }
                catch (error) {
                    console.log(error);
                    yield context.sendActivity(botbuilder_1.MessageFactory.text(`${error} - try again later!`));
                    yield next();
                }
            }
        }));
        this.onMembersAdded((context, next) => __awaiter(this, void 0, void 0, function* () {
            const membersAdded = context.activity.membersAdded;
            const welcomeText = 'Hi, this is ChatGPT model! How can I help you?';
            for (const member of membersAdded) {
                if (member.id !== context.activity.recipient.id) {
                    yield context.sendActivity(botbuilder_1.MessageFactory.text(welcomeText, welcomeText));
                    conversation_history_dict[context.activity.conversation.id] = [messages_init];
                }
            }
            // By calling next() you ensure that the next BotHandler is run.
            yield next();
        }));
    }
}
exports.EchoBot = EchoBot;
//# sourceMappingURL=bot.js.map