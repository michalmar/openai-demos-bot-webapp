// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as path from 'path';

import { config } from 'dotenv';
const ENV_FILE = path.join(__dirname, '..', '.env.local');
config({ path: ENV_FILE });

import * as restify from 'restify';

import { INodeSocket } from 'botframework-streaming';

// Import required bot services.
// See https://aka.ms/bot-services to learn more about the different parts of a bot.
import {
    CloudAdapter,
    ConfigurationServiceClientCredentialFactory,
    ConfigurationBotFrameworkAuthentication,
    ConfigurationBotFrameworkAuthenticationOptions
} from 'botbuilder';

// This bot's main dialog.
import { EchoBot } from './bot';

// Create HTTP server.
const server = restify.createServer();
server.use(restify.plugins.bodyParser());
server.listen(process.env.port || process.env.PORT || 3978, () => {
    console.log(`\n${server.name} listening to ${server.url}`);
    console.log('\nGet Bot Framework Emulator: https://aka.ms/botframework-emulator');
    console.log('\nTo talk to your bot, open the emulator select "Open Bot"');
});

const botFrameworkAuthentication = new ConfigurationBotFrameworkAuthentication(process.env as ConfigurationBotFrameworkAuthenticationOptions);

// Create adapter.
// See https://aka.ms/about-bot-adapter to learn more about how bots work.
const adapter = new CloudAdapter(botFrameworkAuthentication);

// Catch-all for errors.
const onTurnErrorHandler = async (context, error) => {
    // This check writes out errors to console log .vs. app insights.
    // NOTE: In production environment, you should consider logging this to Azure
    //       application insights.
    console.error(`\n [onTurnError] unhandled error: ${ error }`);

    // Send a trace activity, which will be displayed in Bot Framework Emulator
    await context.sendTraceActivity(
        'OnTurnError Trace',
        `${ error }`,
        'https://www.botframework.com/schemas/error',
        'TurnError'
    );

    // Send a message to the user
    await context.sendActivity('The bot encountered an error or bug.');
    await context.sendActivity('To continue to run this bot, please fix the bot source code.');
};

// Set the onTurnError for the singleton CloudAdapter.
adapter.onTurnError = onTurnErrorHandler;

// Create the main dialog.
const myBot = new EchoBot();

// Listen for incoming requests.
server.post('/api/messages', async (req, res) => {
    // Route received a request to adapter for processing
    await adapter.process(req, res, (context) => myBot.run(context));
});

// Listen for HTTP request on /
server.get('/', (req, res) => {
    // res.send('Hello World!');

    // display basic html page
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.write(`
    
    <!DOCTYPE html>
    <html>
    <head>
        <script
        crossorigin="anonymous"
        src="https://cdn.botframework.com/botframework-webchat/latest/webchat.js"
        ></script>
        <style>
        html,
        body {
            height: 100%;
            background-image: linear-gradient(slategrey, darkslategrey);
            color: antiquewhite;
            font-family: 'Segoe UI', Calibri, sans-serif;
        }

        body {
            padding-left: 5px;
        }

        #webchat {
            height: 85%;
            width: 100%;
        }
        .webchat__stacked-layout__main{
            white-space: break-spaces;
            
        }
        .webchat__stacked-layout--from-user{
            background-color: rgba(70, 130, 180, .2);
        }
        
        </style>
    </head>
    <body>
        
        <h1><img src='https://logos-world.net/wp-content/uploads/2021/02/Microsoft-Azure-Emblem.png' height="40">Azure OpenAI Service demo</h1>
        <pre>version 20230131</pre>
        <div style="" id="webchat" role="main"></div>
        <script>
        // Set  the CSS rules.
        const styleSet = window.WebChat.createStyleSet({
            bubbleBackground: 'transparent',
            bubbleBorderColor: 'darkslategrey',
            bubbleBorderRadius: 5,
            bubbleBorderStyle: 'solid',
            bubbleBorderWidth: 0,
            bubbleTextColor: 'antiquewhite',

            userAvatarBackgroundColor: 'rgba(70, 130, 180, .3)',
            bubbleFromUserBackground: 'transparent', 
            bubbleFromUserBorderColor: '#E6E6E6',
            bubbleFromUserBorderRadius: 5,
            bubbleFromUserBorderStyle: 'solid',
            bubbleFromUserBorderWidth: 0,
            bubbleFromUserTextColor: 'antiquewhite',

            notificationText: 'white',

            bubbleMinWidth: 400,
            bubbleMaxWidth: 720,

            botAvatarBackgroundColor: 'antiquewhite',
            avatarBorderRadius: 2,
            avatarSize: 40,

            rootHeight: '100%',
            rootWidth: '100%',
            backgroundColor: 'rgba(70, 130, 180, .2)',

            hideUploadButton: 'true'
        });

        // After generated, you can modify the CSS rules.
        // Change font family and weight. 
        styleSet.textContent = {
            ...styleSet.textContent,
            fontWeight: 'regular'
        };

        // Set the avatar options. 
        const avatarOptions = {
            botAvatarInitials: '.',
            userAvatarInitials: 'Me',
            botAvatarImage: 'https://dwglogo.com/wp-content/uploads/2019/03/1600px-OpenAI_logo-1024x705.png',
            
            };

        window.WebChat.renderWebChat(
            {
            directLine: window.WebChat.createDirectLine({
                token: 'F6Oqh7KxG2s.hVaK5reI6KLfaF_BAbs4m5h2jfUTq8OYkS_E3tpm0ys'
            }),
            styleSet, styleOptions: avatarOptions
            },
            document.getElementById('webchat')
        );
        </script>
        
    </body>
    </html>
    `);
    res.end();

});

// Listen for Upgrade requests for Streaming.
server.on('upgrade', async (req, socket, head) => {
    // Create an adapter scoped to this WebSocket connection to allow storing session data.
    const streamingAdapter = new CloudAdapter(botFrameworkAuthentication);

    // Set onTurnError for the CloudAdapter created for each connection.
    streamingAdapter.onTurnError = onTurnErrorHandler;

    await streamingAdapter.process(req, socket as unknown as INodeSocket, head, (context) => myBot.run(context));
});
