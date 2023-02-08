# Simple Chatbot using Azure OpenAI service

## Introduction
Chatbots are computer programs that are used to create interaction between humans and computers. OpenAI `text-davinci` is a modern language model based on neural networks developed to understand human language. This article will focus on how to create an effective chatbot based on the [Azure OpenAI](https://learn.microsoft.com/en-us/azure/cognitive-services/openai/) `text-davinci` model.

In the OpenAI family, there are many models available today, which differ from each other in their focus (natural language, code, images), but also in complexity and what they can do. You can find a nice introduction and examples on [Azure Documentation ](https://learn.microsoft.com/en-us/azure/cognitive-services/openai/concepts/models).

## Target

The goal is to create a simple chatbot using minimal effort, ie. we will use services and components that are already available with just a slight modification.

**What components will such a chatbot have?**

Chat logic - the heart of a chatbot is the ability to respond to user input, questions and requests. It should understand what the user is asking, ask for additional information in case of ambiguity and provide (if possible the correct) answer. Here we will rely on the [Azure OpenAI](https://learn.microsoft.com/en-us/azure/cognitive-services/openai/) service.

Front-end, or GUI, will most likely be a web application that mediates user communication with its own chatbot. However, often such a chatbot can have more than one such interface: part of the users communicates via the website, part can use a mobile app, and another part can, for example, communicate within the Teams platform. This means that the chatbot uses multiple channels without need to edit the bot for each channel separately.

Communication through channels will be provided by [Azure Bot Service](https://azure.microsoft.com/en-us/products/bot-services/#features), which can expose and manage communication with different channels (Web/Direct, Teams , but perhaps also Email, SMS, Slack, etc. - more [here](https://learn.microsoft.com/en-us/azure/bot-service/bot-service-channels-reference?view=azure-bot-service-4.0))

Services and tools used:
- Azure OpenAI - the heart / logic of the chatbot
- Azure App Service (Web App) - GUI exposure and chatbot hosting
- Azure Bot Service - a service for managing communication through various channels

## Architecture / Solution design

```mermaid
graph TD;
webapp(Web UI & Bot\n hosting) -- query --> bot;
bot((Bot Service)) -- response --> webapp;
bot <-->  oai(OpenAI service);

```

## Implementation

The procedure is simple. We will make maximum use of prepared templates and examples.

### Creation of OpenAI service

In the first step, we will create an OpenAI service - for this you need to [fill in the form](https://customervoice.microsoft.com/Pages/ResponsePage.aspx?id=v4j5cvGGr0GRqy180BHbR7en2Ais5pxKtso_Pz4b1_xUOFA5Qk1UWDRBMjg0WFhPMkIzTzhKQ1dWNyQlQCN0PWcu). As part of this service, we have access to the Azure OpenAI studio, where we can start by selecting and deploying the model - `text-davinci-003`, which is a GPT3.5 model. At the same time, it offers the option of a "playground" where you can test models and try your own prompts.

![azure openai playground](./docs/img/oai-playground.png)

### Creating a chatbot - editing the code

The second step is to create your own bot within the Bot Framework, or we will start from a template for a simple web chatbot - [echo bot](https://github.com/microsoft/BotBuilder-Samples/tree/main/samples/typescript_nodejs/02.echo-bot). I chose JavaScript/TypeScript, but you can also find an example for Python or C#.

In the `bot.ts` file you can see the chat application's own logic, we will focus on the `onMessage` method, which reacts to the arrival of a message from the user.

```javascript
this.onMessage(async (context, next) => {
    const replyText = `Echo: ${ context.activity.text }`;
    await context.sendActivity(MessageFactory.text(replyText, replyText));
    // By calling next() you ensure that the next BotHandler is run.
    await next();
});
```

We modify this method in such a way that we send the user input (query or command) in the variable `context.activity.text` to the OpenAI service to get the answer and subsequently use the answer from OpenAI in the answer to the user (`data.choices[0].text `):

```javascript
this.onMessage(async (context, next) => {
    
    const requestBody =     {
        prompt: context.activity.text
        , max_tokens: 500
        , temperature: 0.7
    };
    const data = await postDataToEndpoint(url, requestBody, headers);
    
    const replyText = `${ data.choices[0].text }`;

    await context.sendActivity(MessageFactory.text(replyText));
    
    // By calling next() you ensure that the next BotHandler is run.
    await next();
});
```

But this does not make the chatbot we probably would like have - we are missing two basic features:
- chatbot personality - prompt
- preserving the context of the communication

**How to achieve that?**

Working with OpenAI text models mainly consists of correct setting and tuning of the prompt (more [here](https://learn.microsoft.com/en-us/azure/cognitive-services/openai/how-to/completions)). We will use this prompt for our chatbot:

```
As an advanced chatbot, your primary goal is to assist users to the best of your ability. This may involve answering questions, providing helpful information, or completing tasks based on user input. In order to effectively assist users, it is important to be detailed and thorough in your responses. Use examples and evidence to support your points and justify your recommendations or solutions.

<conversation history>

User: <user input>
Chatbot:
```

In the first part, there is an instruction on how the model will behave to the entered text - giving answers including examples to support decision-making, completion. This is where personality tuning may appear as well, for example: behave professionally or firendly etc.

Then the following section `<conversation history>` holds the history of the conversation and we gradually adding the the input and output of the chatbot. This part is important so that the chat bot correctly understands the context of the communication.

Next is `User: <user input>`, for which we will add the user input.


The entire function can then look like this:

```javascript
this.onMessage(async (context, next) => {
    
    // construct prompt
    let tmp_prompt = prompt.replace("<conversation history>", conversation_history).replace("<user input>", context.activity.text)
    
    // construct request
    const requestBody =     {
        prompt: tmp_prompt
        , max_tokens: 500
        , temperature: 0.7

    };

    // send request to OpenAI
    const data = await postDataToEndpoint(url, requestBody, headers);


    // update converstation historz
    conversation_history = conversation_history + "User: " + context.activity.text + "\nChatbot: " + data.choices[0].text + "\n"
    
    const replyText = `${ data.choices[0].text }`;

    await context.sendActivity(MessageFactory.text(replyText));
    
    // By calling next() you ensure that the next BotHandler is run.
    await next();
});
```

We can test such a chatbot locally in [Bot Framework Emulator](https://github.com/microsoft/BotFramework-Emulator):

![bot framework emulator](./docs/img/bot-emu1.png)

### Deployment do Azure

After we have tested that the chatbot listens to us and responds in the local environment, we can proceed to the next step, which is deployment to Azure. We are doing this for two reasons:

1. we need the service to be accessible from anywhere
1. we want to be able to run our chatbot on multiple channels

In case we use [VS Code](https://code.visualstudio.com/) for development (which I highly recommend), we can use the extension for working with Azure Web App for the (1-click) deployment itself.

![vscode](./docs/img/vscode.png)

This is good for one-time testing, for easier iterative development I recommend using the [automatic deployment to Azure Web App using GitHub Actions](https://learn.microsoft.com/en-us/azure/app-service/deploy-continuous- deployment?tabs=github).

### Configure Azure / Bot Service

The bot itself (the engine) is now already hosted in Azure - all we have to do is expose it using the [Azure Bot Service](https://portal.azure.com/#create/Microsoft.AzureBot) to access multiple channels without the need to change the code.

Just enter the URL of the web application created in the previous step into the Bot service settings - such a URL is the FQDN of the given application plus `api/messages`, i.e. looks something like this:

```url
https://YOUR-WEB-APP.azurewebsites.net/api/messages
```

![bot service](./docs/img/bot-service.png)

If everything was correct, we can directly test the service in Web Chat within the bot service directly on the Azure Portal:

![web chat test](./docs/img/bot-service-test.png)

This gave us access to several channels: Web Chat, Microsoft Teams, Facebook Messenger, Slack, Twilio SMS,... (full list [here](https://learn.microsoft.com/en-us/azure/ bot-service/bot-service-channels-reference?view=azure-bot-service-4.0))


### Front-end / Web application

Now that the chatbot works for us and is deployed in Azure, we can test the most common integrations into the website. The easiest option is that you can generate an integration using an `iframe` and then just insert this code into your HTML page.

```html
<iframe src='https://webchat.botframework.com/embed/YOUR-BOT-NAME?s=YOUR_SECRET_HERE'  style='min-width: 400px; width: 100%; min-height: 500px;'>
</iframe>
```

Another option is to directly use WebChat integration into the page - more [here](https://learn.microsoft.com/en-us/azure/bot-service/bot-builder-webchat-overview?view=azure-bot-service-4.0) and the source is at: [https://github.com/microsoft/BotFramework-WebChat](https://github.com/microsoft/BotFramework-WebChat/tree/main/samples/01.getting-started/a.full-bundle).

In short, these are JS libraries that allow simple integration and other customizations:

```html
<!DOCTYPE html>
<html>
   <body>
      <div id="webchat" role="main"></div>
      <script src="https://cdn.botframework.com/botframework-webchat/latest/webchat.js"></script>
      <script>
         window.WebChat.renderWebChat(
            {
               directLine: window.WebChat.createDirectLine({
                  token: 'YOUR_DIRECT_LINE_TOKEN'
               }),
               userID: 'YOUR_USER_ID'
            },
            document.getElementById('webchat')
         );
      </script>
   </body>
</html>
```

Where `YOUR_DIRECT_LINE_TOKEN` is the token for direct line communication within the Bot Service and `YOUR_USER_ID` is your chosen identification

![direct line token](./docs/img/direct-line.png)

Such a page then contains our just-prepared chatbot. The WebChat framework offers a lot of customization options, so you can change almost anything from colors to the display of chat member indicators - more [here](https://learn.microsoft.com/en-us/azure/bot-service/bot-builder-webchat-customization?view=azure-bot-service-4.0).

So our chatbot can look like this:

![web app chat bot](./docs/img/webapp-final-en.png)

## Conclusion

This was a demonstration of how to create a simple chatbot that knows the answer to almost any question :-) because it uses the powerful model `text-davinci-003` from the Azure OpenAI service.

You can try it yourself if you want! The full source code is available on my GitHub: [https://github.com/michalmar/openai-demos-bot-webapp](https://github.com/michalmar/openai-demos-bot-webapp). In order to use the Azure OpenAI service, you must first request access - [form](https://customervoice.microsoft.com/Pages/ResponsePage.aspx?id=v4j5cvGGr0GRqy180BHbR7en2Ais5pxKtso_Pz4b1_xUOFA5Qk1UWDRBMjg0WFhPMkIzTzhKQ1dWNyQlQCN0PWcu).