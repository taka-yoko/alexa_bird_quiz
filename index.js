'use strict';
const Alexa = require('ask-sdk');

// クイズ生成ライブラリ
const SoundQuiz = require('./sound-quiz');

// AlexaスキルID（実際のものに置き換えてください）
const SKILL_ID = 'amzn1.ask.skill.577cf6d1-c749-4cb9-b7ee-469efd59da86';

// 文字列をXML用にエスケープして返す
function escapeXML(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// quizオブジェクトの音をすべて再生するSSMLを返す
function quizToSSML(quiz) {
  let speak = '';
  quiz.sounds.forEach((sound, i) => {
    console.log(`<s>${i + 1}番、<audio src="` + escapeXML(sound.url) + '"/></s>');
    speak += `<s>${i + 1}番、<audio src="` + escapeXML(sound.url) + '"/></s>';
  });
  return speak;
}

// クイズの問題文を言う
function speakQuiz(handlerInput, quiz) {
  let question =
    quizToSSML(quiz) + quiz.sounds[quiz.answerIndex].name + 'は何番？';

  let speak = quiz.sounds.length + 'つの鳥の鳴き声を流します。';
  speak += question;
  let reprompt = '番号で答えてください。' + question;
  return handlerInput.responseBuilder
    .speak(speak)
    .reprompt(reprompt)
    .getResponse();
}

// handlerInputの中に含まれるスロット名slotNameの値を返す。
// 値がない場合はnullを返す。
function getSlotValue(handlerInput, slotName) {
  // スロットがなければnullを返す
  const intent = handlerInput.requestEnvelope.request.intent;
  if (!intent || !intent.slots || !intent.slots[slotName]) {
    return null;
  }

  const slot = intent.slots[slotName];

  // カスタムスロットタイプの場合は解決した結果を取得
  if (slot.resolutions) {
    let res = slot.resolutions.resolutionsPerAuthority;
    if (res && res.length > 0 && res[0].status.code === 'ER_SUCCESS_MATCH') {
      return res[0].values[0].value.name;
    }
  }

  return slot.value ? slot.value : null;
}

// ヘルプメッセージを言う
function speakHelp(handlerInput) {
  const msg = '鳥の名前をもとに正しい鳴き声の番号を当ててください。' +
    'クイズを始めるには「クイズ」と言ってください。' +
    'スキルを終了するには「ストップ」と言ってください。どうしますか？';
  return handlerInput.responseBuilder
    .speak(msg)
    .reprompt(msg)
    .getResponse();
}

// LaunchRequestとQuizインテントのハンドラ
const QuizIntentHandler = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === 'LaunchRequest' ||
      (handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
        (handlerInput.requestEnvelope.request.intent.name === 'Quiz' ||
          handlerInput.requestEnvelope.request.intent.name === 'AMAZON.YesIntent')
      )
    );
  },
  handle(handlerInput) {
    // クイズを作成
    const quiz = SoundQuiz.create();
    // quizの中身は以下のようなオブジェクト
    // {
    //   sounds: [
    //     { name: '音1', url: 'https://example.com/sound1.mp3' },
    //     { name: '音2', url: 'https://example.com/sound2.mp3' },
    //     { name: '音3', url: 'https://example.com/sound3.mp3' }
    //   ],
    //   answerIndex: 2
    // }

    // セッションにクイズデータを保存
    handlerInput.attributesManager.setSessionAttributes({
      quiz: quiz,
    });

    // 問題文を言う
    return speakQuiz(handlerInput, quiz);
  },
};

// QuizAnswerインテントのハンドラ
const QuizAnswerIntentHandler = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
      handlerInput.requestEnvelope.request.intent.name === 'QuizAnswer'
    );
  },
  handle(handlerInput) {
    // Numberスロットの値が埋まるまで待つ
    if (handlerInput.requestEnvelope.request.dialogState !==
        'COMPLETED') {
      return handlerInput.responseBuilder
        .addDelegateDirective()
        .getResponse();
    }

    let userAnswer =
      getSlotValue(handlerInput, 'Number');
    if (userAnswer !== null) {
      userAnswer = parseInt(userAnswer, 10);
    }
    let attrs = handlerInput.attributesManager.getSessionAttributes();
    const quiz = attrs.quiz;
    if (!quiz) { // クイズが出題中でない
      return speakHelp(handlerInput);
    }

    let msg = '<p>';
    if (userAnswer === quiz.answerIndex + 1) {
      msg += '<say-as interpret-as="interjection">'+
        'ピンポーン</say-as>、<prosody pitch="high">' +
        '正解です</prosody>。';
    } else {
      msg += 'ハズレです。正解は、' +
        (quiz.answerIndex + 1) + '番でした。';
    }
    msg += '</p><p>もう一回、やりますか？</p>';
    const reprompt = 'はい、か、いいえ、で答えてください。もう一回、やりますか？';

    // セッションに保存していたquizデータを削除
    attrs.quiz = null;
    handlerInput.attributesManager.setSessionAttributes(attrs);

    return handlerInput.responseBuilder
      .speak(msg)
      .reprompt(reprompt)
      .getResponse();
  },
};

// AMAZON.RepeatIntent（問題文を繰り返す）のハンドラ
const RepeatIntentHandler = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
      handlerInput.requestEnvelope.request.intent.name === 'AMAZON.RepeatIntent'
    );
  },
  handle(handlerInput) {
    const attrs = handlerInput.attributesManager.getSessionAttributes();
    if (attrs.quiz) { // クイズ出題中
      return speakQuiz(handlerInput, attrs.quiz);
    } else {
      const msg = 'もう一回、やりますか？';
      return handlerInput.responseBuilder
        .speak(msg)
        .reprompt(msg)
        .getResponse();
    }
  },
};

// AMAZON.HelpIntent（スキルの使い方）を言う
const HelpIntentHandler = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
      handlerInput.requestEnvelope.request.intent.name === 'AMAZON.HelpIntent'
    );
  },
  handle(handlerInput) {
    return speakHelp(handlerInput);
  },
};

// スキルを終了するためのハンドラ
const ExitHandler = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
      (handlerInput.requestEnvelope.request.intent.name ===
        'AMAZON.CancelIntent' ||
        handlerInput.requestEnvelope.request.intent.name ===
          'AMAZON.StopIntent' ||
        handlerInput.requestEnvelope.request.intent.name ===
          'AMAZON.NoIntent')
    );
  },
  handle(handlerInput) {
    const msg = 'また遊んでくださいね。';
    return handlerInput.responseBuilder
      .speak(msg)
      .getResponse();
  },
};

// スキルが終了したときに呼ばれる
const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
  },
  handle(handlerInput) {
    const req = handlerInput.requestEnvelope.request;
    if (req.error) {
      console.error('[ERROR] ' + req.error.type +
                    ': ' + req.error.message);
    }
    return handlerInput.responseBuilder.getResponse();
  },
};

// JavaScriptのエラーが投げられた場合に受け取る
const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.log('ErrorHandler:', JSON.stringify(error));
    console.log('handlerInput:', JSON.stringify(handlerInput));
    return speakHelp(handlerInput);
  },
};

exports.handler = Alexa.SkillBuilders.custom()
  .withSkillId(SKILL_ID)
  // インテント一覧
  .addRequestHandlers(
    QuizIntentHandler,
    QuizAnswerIntentHandler,
    RepeatIntentHandler,
    HelpIntentHandler,
    ExitHandler,
    SessionEndedRequestHandler
  )
  .addErrorHandlers(ErrorHandler)
  .lambda();
