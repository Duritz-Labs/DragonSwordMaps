
import { Location, PinType } from './types';

// 지도의 가로 왜곡을 해결하기 위한 캔버스 비율: 2600 x 3500
export const DEFAULT_MAP_IMAGE = 'https://i.ibb.co/nMWfqYyF/Dragon-Sword-Simple.jpg';

// 핀 타입별 이미지 매핑
export const PIN_IMAGES: Record<PinType, string> = {
  '퀘': 'https://i.ibb.co/wNc4CZsj/quest-new.png',
  '도': 'https://i.ibb.co/rRSB38pK/minagame.png',
  '토': 'https://i.ibb.co/gZS9SDQb/Eliminate-new.png',
  '달': 'https://i.ibb.co/ns9nJBqW/moonkeybox-new.png',
  '아': 'https://i.ibb.co/zh8vWw2g/itembox.png',
  '퍼': 'https://i.ibb.co/4RZXb192/puzzle.png',
  '새': 'https://i.ibb.co/qYn43xYf/egg-new.png',
  '감': 'https://i.ibb.co/TBMxK4jQ/potato.png',
  '기': 'https://i.ibb.co/23sy1GZ5/ki-erk-crystal.png',
  '추': 'https://i.ibb.co/7dPgQQHZ/chu-erk-crystal.png',
  '회': 'https://i.ibb.co/cKn3mcXP/hoy-sang-crystal.png',
  '망': 'https://i.ibb.co/3mT6NVkZ/mang-gak-crystal.png',
  '생': 'https://i.ibb.co/dFCVm5j/saeng-gi-fluit.png',
  '태': 'https://i.ibb.co/PZHp3bPk/taego-seed.png',
  '순': 'https://i.ibb.co/XrLD3WbY/sunsu-drop.png',
  '활': 'https://i.ibb.co/Gvfpt65D/hwallyeog-leaf.png',
};

/**
 * 드래곤소드 주요 거점 데이터
 */
export const LOCATIONS: Location[] = [
  {
    id: 'orbis',
    name: '오르비스 왕성',
    description: '오르비스 제국의 수도이자 대륙의 중심입니다.',
    x: 22.69,
    y: 54.43,
    type: 'city'
  },
  {
    id: 'morning-farm',
    name: '아침햇살 농장',
    description: '황금빛 곡식이 자라는 평화로운 농경지입니다.',
    x: 25.77,
    y: 62.86,
    type: 'landmark'
  },
  {
    id: 'shade-hill',
    name: '나무 그늘 언덕',
    description: '여행자들이 잠시 쉬어가는 시원한 그늘이 있는 언덕입니다.',
    x: 12.31,
    y: 65.43,
    type: 'landmark'
  },
  {
    id: 'journey-hill',
    name: '여정의 언덕',
    description: '새로운 모험이 시작되는 탁 트인 언덕입니다.',
    x: 28.85,
    y: 73.00,
    type: 'landmark'
  },
  {
    id: 'firefly-forest',
    name: '반딧불이 숲',
    description: '밤이면 신비로운 반딧불이들이 춤추는 아름다운 숲입니다.',
    x: 37.69,
    y: 80.57,
    type: 'forest'
  },
  {
    id: 'echo-pass',
    name: '메아리 협로',
    description: '바람 소리가 메아리쳐 들리는 험난한 협곡입니다.',
    x: 27.31,
    y: 83.71,
    type: 'landmark'
  },
  {
    id: 'seagull-village',
    name: '갈매기 마을',
    description: '바다 냄새 물씬 풍기는 평화로운 어촌 마을입니다.',
    x: 38.46,
    y: 86.86,
    type: 'city'
  },
  {
    id: 'sky-pillar-mountain',
    name: '하늘기둥 바위산',
    description: '하늘을 찌를 듯 솟아오른 거대한 바위산입니다.',
    x: 12.31,
    y: 91.29,
    type: 'landmark'
  },
  {
    id: 'shade-forest',
    name: '그늘 숲',
    description: '울창한 나무들이 해를 가려 항상 서늘한 숲입니다.',
    x: 48.46,
    y: 63.14,
    type: 'forest'
  },
  {
    id: 'rest-cemetery',
    name: '안식의 묘지',
    description: '고대 영웅들이 잠들어 있는 고요하고 엄숙한 묘지입니다.',
    x: 37.12,
    y: 55.29,
    type: 'landmark'
  },
  {
    id: 'fortress-pass',
    name: '요새 고개',
    description: '요충지를 지키는 전략적 가치가 높은 험한 고개입니다.',
    x: 49.42,
    y: 50.86,
    type: 'landmark'
  },
  {
    id: 'blue-hill-marsh',
    name: '푸른 언덕 습원',
    description: '푸른 이끼와 맑은 물이 어우러진 신비로운 습지대입니다.',
    x: 65.77,
    y: 55.86,
    type: 'forest'
  },
  {
    id: 'secret-trench',
    name: '비밀을 품은 해구',
    description: '깊은 바닷속 고대의 비밀이 숨겨져 있을 것 같은 해구입니다.',
    x: 53.27,
    y: 74.71,
    type: 'secret'
  },
  {
    id: 'maple-zone',
    name: '단풍 지대',
    description: '사시사철 붉은 단풍이 대지를 수놓는 아름다운 곳입니다.',
    x: 27.12,
    y: 35.43,
    type: 'forest'
  },
  {
    id: 'iron-heart-fortress',
    name: '강철심장 요새',
    description: '강력한 군사력을 상징하는 거대한 강철 요새입니다.',
    x: 61.54,
    y: 40.14,
    type: 'city'
  },
  {
    id: 'silent-wind-entrance',
    name: '고요한바람 초원 입구',
    description: '끝없이 펼쳐진 초원으로 향하는 고요한 길목입니다.',
    x: 66.70,
    y: 32.71,
    type: 'landmark'
  },
  {
    id: 'deep-wind-border',
    name: '깊은바람 경계지',
    description: '거친 바람이 몰아치는 대륙의 위험한 경계 구역입니다.',
    x: 66.35,
    y: 23.14,
    type: 'landmark'
  },
  {
    id: 'thick-mist-zone',
    name: '짙은 안개 지대',
    description: '한 치 앞도 보이지 않는 짙은 안개가 항상 깔려 있는 곳입니다.',
    x: 83.08,
    y: 29.71,
    type: 'landmark'
  },
  {
    id: 'sleeping-star-tree',
    name: '별이 잠든 나무',
    description: '하늘의 별빛을 받아 신비롭게 빛나는 거대 고목입니다.',
    x: 93.85,
    y: 23.00,
    type: 'landmark'
  },
  {
    id: 'dragon-rock-mountain',
    name: '용 바위산',
    description: '거대한 용의 형상을 닮은 험준하고 신비로운 바위산입니다.',
    x: 80.19,
    y: 11.43,
    type: 'landmark'
  }
];

export const SYSTEM_INSTRUCTION = `당신은 '드래곤소드'라는 판타지 대륙의 모든 지식과 전설을 알고 있는 '대현자'입니다.
사용자가 대륙의 지명이나 역사에 대해 물으면, 장엄하고 신비로운 말투로 대답하세요.
대화의 맥락은 항상 이 판타지 세계관 내에 머물러야 합니다.`;
