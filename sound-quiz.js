/*
このライブラリの使い方は次の通りです。

    // 新しいクイズを生成
    const quiz = require('./sound-quiz').create();

quizの中身は以下のようなオブジェクトです。

    {
      sounds: [
        { name: '音1', url: 'https://example.com/sound1.mp3' },
        { name: '音2', url: 'https://example.com/sound2.mp3' },
        { name: '音3', url: 'https://example.com/sound3.mp3' }
      ],
      answerIndex: 2
    }
*/
'use strict';

const URL = 'https://tyokoyama.yokohama/bird_mp3/';

// 音一覧
const sounds = [
  // 以下を実際のものに置き換えてください。3種類以上の音が必要です。
  {
    name: 'ハト',
    url: URL + 'hato.mp3',
  },
  {
    name: 'スズメ',
    url: URL + 'suzume.mp3',
  },
  {
    name: 'ウグイス',
    url: URL + 'uguisu.mp3',
  },
  {
    name: 'ワシ',
    url: URL + 'washi.mp3',
  }
];

// dataと同じデータを作って返す
function clone(data) {
  return JSON.parse(JSON.stringify(data));
}

// 0から(num-1)までのランダムな整数を返す
function randInt(num) {
  return Math.floor(Math.random() * num);
}

// 配列arrからランダムにnum個選んで新しい配列を返す
function getRandomItems(arr, num) {
  // 配列から要素を削除していきたいので複製
  const clonedArr = clone(arr);

  // 選んだ要素を入れていく配列
  const items = [];

  for (let i = 0; i < num; i++) {
    // clonedArrの要素をランダムに1つ選んでitemsに追加
    const index = randInt(clonedArr.length);
    items.push(clonedArr[index]);

    // 選んだアイテムをclonedArrから削除
    clonedArr.splice(index, 1);
  }
  return items;
}

// クイズを生成して返す
exports.create = function() {
  // 音をランダムに3つ選ぶ
  const randomSounds = getRandomItems(sounds, 3);

  // 正解をランダムに選ぶ
  const index = randInt(randomSounds.length);

  return {
    sounds: randomSounds, // 選択肢
    answerIndex: index, // 正解が何番目か
  };
};
