# Jednoduchý Chatbot s pomocí Azure OpenAI služby

## Úvod
Chatboty jsou počítačové programy, které slouží k vytváření interakce mezi lidmi a počítači. OpenAI text-davinci je moderní jazykový model založený na neuronovžch sítích, který byl vyvinut s cílem porozumět lidskému jazyku. Tento článek se zaměří na to, jak vytvořit účinný chatbot založený na OpenAI text-davinci modelu.

V rodině OpenAI je dnes k dispozici monho modelů, které se navzájem liší svým zaměřením (přirozený jazyk, kód, obrázky), ale také komplexitou a tím co dokážou. ####TODO: odkaz Tomáš Kubica článek ####

Cílem je vytvořit jednoduchý chatbot s použitím minmálního úsilí, tzn. budeme využívat služby a komponenty, které jsou již v zásadě připravené.

Jaké komponenty takový chatbot bude mít? 

Chatovací logika - srdce chatbota je ve schopnosti reagovat na uživatelské podněty, dotazy a požadavky. Měl by pochopit na co se uživatel ptá, v přápadě nejsasností se doptat na doplňující informace a poskytnout (pokud možno správnou) odpoveď. Tady právě budeme spoléhat na Azure OpenAI službu.

Front-end, resp. GUI, nejspíš webová aplikace, která zprostředkuje komunikaci uživatele s vlastním chatbotem. Nicméně, často takový chatbot může mít takových interfaců více: část uživatelů komunikuje přes webové stránky, část může používat aplikaci v mobilu a další část může například komunikovat v rámci Teams platformy. To znamená, že chatbot využívá více kanalů - idealní samozřejmě je, pokud nemusím upravovat bot pro každý kanál zvlášť. 

Komunikaci skrz kanály bude poskytovat Azure Bot Service, které umí vystavit a řídit komunikaci s různými kanály (Web/Direct, Teams, ale třeba taky Email, SMS, Slack atp.) #### TODO: odkazy #####

Použité služby a nástroje:
- Azure OpenAI - srdce / logika chatbota
- Azure App Service (Web App) - vystavení GUI a hosting chatbota
- Azure Bot Service - služba pro čízení komunikace přes různé kanály

## Architektura / Návrh řešení

TODO: obrazek

## Implementace

Postup je jednoduchý. Budeme využívat maximálně připravených template a příkladů, které jsou k dispozici na ####TODO: ####. 

V prním kroku vytvoříme OpenAI službu - k té je potřeba [vyplnit formulář](https://customervoice.microsoft.com/Pages/ResponsePage.aspx?id=v4j5cvGGr0GRqy180BHbR7en2Ais5pxKtso_Pz4b1_xUOFA5Qk1UWDRBMjg0WFhPMkIzTzhKQ1dWNyQlQCN0PWcu). V rámci této služby máme přístup na Azure OpenAI studio, kde můžeme začít výběrem a deploymentem modelu - `text-davinci-003`, což je model GPT3.5. Zároveň nabizí možnost "hracího hřiště" (playground), kde můžete modely zkoušet a zkoušet taky vlastní prompty.

Druhý krok je tvorba vlastního bota v rámci Bot Frameworku, resp. vyjdeme z template pro jednoduchého web chatbota - [echo bot](https://github.com/microsoft/BotBuilder-Samples/tree/main/samples/typescript_nodejs/02.echo-bot). V souboru `bot.js` je vidět vlastní logika chat aplikace, my se zaměříme na `onMessage` metodu, která reaguje na příchod zprávy od uživatele.

```javascript
this.onMessage(async (context, next) => {
    const replyText = `Echo: ${ context.activity.text }`;
    await context.sendActivity(MessageFactory.text(replyText, replyText));
    // By calling next() you ensure that the next BotHandler is run.
    await next();
});
```

My tuto metodu upravíme tak, že uživatelský vstup (dotaz nebo povel) v proměnné `context.activity.text`, pošleme pro získání odpovědi do OpenAI služby:

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

Tím ale ještě neznikne chatbot, kterého bychom chtěli - chybí nám dvě základní věci:
- chatbot osobnost - prompt
- uchování kontextu komunikace

Jak na to?

Práce s OpenAI textovými modely spočívá hlavně ve správném nastvení a vyladění promptu (více ####TODO). Pro našeho chatbota použijeme prompt:

```
As an advanced chatbot, your primary goal is to assist users to the best of your ability. This may involve answering questions, providing helpful information, or completing tasks based on user input. In order to effectively assist users, it is important to be detailed and thorough in your responses. Use examples and evidence to support your points and justify your recommendations or solutions.

<conversation history>

User: <user input>
Chatbot:
```

V první části je instrukce jak se model bude k zadaníému textu chovat. ####TODO

Pak náseleduje sekce `<conversation history>`, která drží historii konverzace a postupně ji doplňujeme o vstup a výstup chatbota. Tato část je důležitá proto, aby chat bot správně držel kontext komunikace.

Dále je `User: <user input>`, za což doplníme uživatelský vstup.


Celá funkce pak může vypadat takto:

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

Takového chatbota můžeme vyzkoušet lokálně v Bot Framework Emulator: ####TODO: linky a priklad

Další krok, deployment do Azure.

####TODO:
