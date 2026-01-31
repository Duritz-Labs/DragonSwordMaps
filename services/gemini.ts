
import { GoogleGenAI } from "@google/genai";
import { SYSTEM_INSTRUCTION } from "../constants";

/**
 * 대현자에게 지혜를 구하는 함수입니다.
 * @param prompt 사용자의 현재 입력
 * @param history 이전 대화 기록 (context 유지용)
 */
export async function askSage(prompt: string, history: { role: 'user' | 'assistant', content: string }[]) {
  // 가이드라인에 따라 호출 직전에 GoogleGenAI 인스턴스를 생성합니다.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // 채팅 세션을 생성하여 대화 맥락을 유지합니다.
  const chat = ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.7,
    },
    // 이전 대화 기록을 Gemini 형식으로 매핑합니다.
    history: history.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }))
  });

  try {
    // sendMessage를 통해 메시지를 보내고 응답을 기다립니다.
    const response = await chat.sendMessage({ message: prompt });
    // response.text 프로퍼티를 통해 텍스트 결과에 직접 접근합니다.
    return response.text || "대현자가 깊은 생각에 잠겨 답변을 하지 못하고 있네.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "대현자의 지혜가 잠시 흐릿해졌구나. 나중에 다시 물어보게나.";
  }
}
