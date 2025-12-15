import React, { useState, useEffect, useRef } from 'react';
import { Play, RotateCcw, Check, ArrowRight, Trophy, BookOpen, Star, Zap, Volume2, VolumeX, Home } from 'lucide-react';

// --- Types ---
type GameState = 'menu' | 'game' | 'result';
type QuestionType = 'adjective' | 'verb';

interface Question {
  id: number;
  type: QuestionType;
  zh: string;
  ms: string;
  words: string[];
}

interface LevelData {
  title: string;
  desc: string;
  color: string;
  accentColor: string;
  icon: React.ReactNode;
  questions: Question[];
}

interface QuestionBanks {
  [key: number]: LevelData;
}

// --- Sound Engine (Web Audio API) ---
const playSound = (type: 'click' | 'pop' | 'correct' | 'wrong' | 'win' | 'levelSelect') => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    switch (type) {
      case 'click':
        // High blip
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.1);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
        break;
      
      case 'pop':
        // Bubble pop sound
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.linearRampToValueAtTime(500, now + 0.05);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
        break;

      case 'correct':
        // Major triad (C-E-G)
        const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
        notes.forEach((freq, i) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = 'sine';
          o.connect(g);
          g.connect(ctx.destination);
          o.frequency.value = freq;
          g.gain.setValueAtTime(0, now);
          g.gain.linearRampToValueAtTime(0.15, now + 0.05 + (i * 0.05));
          g.gain.exponentialRampToValueAtTime(0.001, now + 0.4 + (i * 0.05));
          o.start(now + (i * 0.05));
          o.stop(now + 0.6 + (i * 0.05));
        });
        return; // Early return as we created multiple oscillators

      case 'wrong':
        // Low buzzer
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.linearRampToValueAtTime(100, now + 0.3);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
        break;

      case 'win':
        // Victory fanfare sequence (simplified)
        const winNotes = [523.25, 659.25, 783.99, 1046.50];
        winNotes.forEach((freq, i) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = 'square';
          o.connect(g);
          g.connect(ctx.destination);
          o.frequency.value = freq;
          const startTime = now + (i * 0.1);
          g.gain.setValueAtTime(0, startTime);
          g.gain.linearRampToValueAtTime(0.1, startTime + 0.05);
          g.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);
          o.start(startTime);
          o.stop(startTime + 0.4);
        });
        return;

      case 'levelSelect':
         // Swish sound
         osc.type = 'sine';
         osc.frequency.setValueAtTime(200, now);
         osc.frequency.exponentialRampToValueAtTime(600, now + 0.2);
         gain.gain.setValueAtTime(0.1, now);
         gain.gain.linearRampToValueAtTime(0, now + 0.2);
         osc.start(now);
         osc.stop(now + 0.2);
         break;
    }

  } catch (e) {
    console.error("Audio play failed", e);
  }
};

// --- Data ---
const questionBanks: QuestionBanks = {
  1: {
    title: "Tahap 1",
    desc: "Kata Adjektif (Sifat)",
    color: "bg-orange-400",
    accentColor: "border-orange-600",
    icon: <Star className="text-white w-8 h-8 md:w-12 md:h-12" />,
    questions: [
      { id: 101, type: 'adjective', zh: '大的球', ms: 'Bola (球) yang besar (大)', words: ['Bola (球)', 'yang', 'besar (大)'] },
      { id: 102, type: 'adjective', zh: '红色的车', ms: 'Kereta (车) yang merah (红)', words: ['Kereta (车)', 'yang', 'merah (红)'] },
      { id: 103, type: 'adjective', zh: '美丽的花', ms: 'Bunga (花) yang cantik (美)', words: ['Bunga (花)', 'yang', 'cantik (美)'] },
      { id: 104, type: 'adjective', zh: '小的家', ms: 'Rumah (家) yang kecil (小)', words: ['Rumah (家)', 'yang', 'kecil (小)'] },
      { id: 105, type: 'adjective', zh: '高的树', ms: 'Pokok (树) yang tinggi (高)', words: ['Pokok (树)', 'yang', 'tinggi (高)'] },
      { id: 106, type: 'adjective', zh: '长头发', ms: 'Rambut (头发) yang panjang (长)', words: ['Rambut (头发)', 'yang', 'panjang (长)'] },
      { id: 107, type: 'adjective', zh: '肥的猫', ms: 'Kucing (猫) yang gemuk (肥)', words: ['Kucing (猫)', 'yang', 'gemuk (肥)'] },
      { id: 108, type: 'adjective', zh: '新的鞋', ms: 'Kasut (鞋) yang baru (新)', words: ['Kasut (鞋)', 'yang', 'baru (新)'] },
      { id: 109, type: 'adjective', zh: '冷的水', ms: 'Air (水) yang sejuk (冷)', words: ['Air (水)', 'yang', 'sejuk (冷)'] },
      { id: 110, type: 'adjective', zh: '好吃的饭', ms: 'Nasi (饭) yang sedap (好吃)', words: ['Nasi (饭)', 'yang', 'sedap (好吃)'] },
    ]
  },
  2: {
    title: "Tahap 2",
    desc: "Kata Kerja (Perbuatan)",
    color: "bg-blue-400",
    accentColor: "border-blue-600",
    icon: <Zap className="text-white w-8 h-8 md:w-12 md:h-12" />,
    questions: [
      { id: 201, type: 'verb', zh: '正在睡觉的猫', ms: 'Kucing (猫) yang tidur (睡)', words: ['Kucing (猫)', 'yang', 'tidur (睡)'] },
      { id: 202, type: 'verb', zh: '正在跑的男孩', ms: 'Budak (男孩) yang berlari (跑)', words: ['Budak (男孩)', 'yang', 'berlari (跑)'] },
      { id: 203, type: 'verb', zh: '正在飞的鸟', ms: 'Burung (鸟) yang terbang (飞)', words: ['Burung (鸟)', 'yang', 'terbang (飞)'] },
      { id: 204, type: 'verb', zh: '正在哭的婴儿', ms: 'Bayi (婴儿) yang menangis (哭)', words: ['Bayi (婴儿)', 'yang', 'menangis (哭)'] },
      { id: 205, type: 'verb', zh: '正在煮饭的妈妈', ms: 'Ibu (妈妈) yang memasak (煮)', words: ['Ibu (妈妈)', 'yang', 'memasak (煮)'] },
      { id: 206, type: 'verb', zh: '正在工作的爸爸', ms: 'Ayah (爸爸) yang bekerja (工作)', words: ['Ayah (爸爸)', 'yang', 'bekerja (工作)'] },
      { id: 207, type: 'verb', zh: '正在吠的狗', ms: 'Anjing (狗) yang menyalak (吠)', words: ['Anjing (狗)', 'yang', 'menyalak (吠)'] },
      { id: 208, type: 'verb', zh: '正在走的人', ms: 'Orang (人) yang berjalan (走)', words: ['Orang (人)', 'yang', 'berjalan (走)'] },
      { id: 209, type: 'verb', zh: '正在读书的学生', ms: 'Murid (学生) yang membaca (读)', words: ['Murid (学生)', 'yang', 'membaca (读)'] },
      { id: 210, type: 'verb', zh: '正在站立的警察', ms: 'Polis (警察) yang berdiri (站)', words: ['Polis (警察)', 'yang', 'berdiri (站)'] },
    ]
  },
  3: {
    title: "Tahap 3",
    desc: "Cabaran Minda",
    color: "bg-purple-500",
    accentColor: "border-purple-700",
    icon: <Trophy className="text-white w-8 h-8 md:w-12 md:h-12" />,
    questions: [
      { id: 301, type: 'adjective', zh: '快的车', ms: 'Kereta (车) yang laju (快)', words: ['Kereta (车)', 'yang', 'laju (快)'] },
      { id: 302, type: 'verb', zh: '正在教书的老师', ms: 'Guru (老师) yang mengajar (教书)', words: ['Guru (老师)', 'yang', 'mengajar (教书)'] },
      { id: 303, type: 'adjective', zh: '蓝色的天', ms: 'Langit (天) yang biru (蓝)', words: ['Langit (天)', 'yang', 'biru (蓝)'] },
      { id: 304, type: 'verb', zh: '正在游泳的鱼', ms: 'Ikan (鱼) yang berenang (游泳)', words: ['Ikan (鱼)', 'yang', 'berenang (游泳)'] },
      { id: 305, type: 'adjective', zh: '圆的眼睛', ms: 'Mata (眼睛) yang bulat (圆)', words: ['Mata (眼睛)', 'yang', 'bulat (圆)'] },
      { id: 306, type: 'verb', zh: '正在唱歌的姐姐', ms: 'Kakak (姐姐) yang menyanyi (唱)', words: ['Kakak (姐姐)', 'yang', 'menyanyi (唱)'] },
      { id: 307, type: 'adjective', zh: '硬的石头', ms: 'Batu (石头) yang keras (硬)', words: ['Batu (石头)', 'yang', 'keras (硬)'] },
      { id: 308, type: 'verb', zh: '正在画画的哥哥', ms: 'Abang (哥哥) yang melukis (画画)', words: ['Abang (哥哥)', 'yang', 'melukis (画画)'] },
      { id: 309, type: 'adjective', zh: '直的路', ms: 'Jalan (路) yang lurus (直)', words: ['Jalan (路)', 'yang', 'lurus (直)'] },
      { id: 310, type: 'verb', zh: '正在跳舞的舞者', ms: 'Penari (舞者) yang menari (跳舞)', words: ['Penari (舞者)', 'yang', 'menari (跳舞)'] },
    ]
  }
};

const YangBuilder: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>('menu');
  const [currentStage, setCurrentStage] = useState<number>(1);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [userSentence, setUserSentence] = useState<string[]>([]); 
  const [availableWords, setAvailableWords] = useState<string[]>([]); 
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null); 
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Helper to play sound if enabled
  const play = (type: Parameters<typeof playSound>[0]) => {
    if (soundEnabled) playSound(type);
  };
  
  const shuffleArray = (array: string[]) => {
    return [...array].sort(() => Math.random() - 0.5);
  };

  const startLevel = (levelId: number) => {
    play('levelSelect');
    setCurrentStage(levelId);
    setGameState('game');
    setCurrentQuestionIndex(0);
    setScore(0);
    loadQuestion(levelId, 0);
  };

  const loadQuestion = (levelId: number, index: number) => {
    setUserSentence([]);
    setFeedback(null);
    const q = questionBanks[levelId].questions[index];
    setAvailableWords(shuffleArray(q.words));
  };

  const handleWordClick = (word: string, index: number) => {
    if (feedback) return;
    play('pop');
    const newAvailable = [...availableWords];
    newAvailable.splice(index, 1);
    setAvailableWords(newAvailable);
    setUserSentence([...userSentence, word]);
  };

  const handleSentenceClick = (word: string, index: number) => {
    if (feedback) return;
    play('pop');
    const newSentence = [...userSentence];
    newSentence.splice(index, 1);
    setUserSentence(newSentence);
    setAvailableWords([...availableWords, word]);
  };

  const checkAnswer = () => {
    const currentQ = questionBanks[currentStage].questions[currentQuestionIndex];
    const currentAnswer = userSentence.join(' ');
    
    if (currentAnswer === currentQ.ms) {
      play('correct');
      setFeedback('correct');
      setScore(prev => prev + 10);
    } else {
      play('wrong');
      setFeedback('wrong');
    }
  };

  const nextQuestion = () => {
    play('click');
    const currentLevelQuestions = questionBanks[currentStage].questions;
    if (currentQuestionIndex < currentLevelQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      loadQuestion(currentStage, currentQuestionIndex + 1);
    } else {
      play('win');
      setGameState('result');
    }
  };

  const goHome = () => {
    play('click');
    setGameState('menu');
  };

  const getCurrentQuestion = () => {
    return questionBanks[currentStage].questions[currentQuestionIndex];
  };

  // Progress percentage
  const progress = ((currentQuestionIndex) / 10) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 to-purple-100 font-sans flex items-center justify-center p-2 md:p-6">
      <div className="w-full max-w-5xl bg-white/90 backdrop-blur-sm rounded-[3rem] shadow-2xl overflow-hidden min-h-[85vh] flex flex-col border-4 border-indigo-200">
        
        {/* Game Header */}
        <div className="bg-indigo-500 p-4 md:p-6 text-white flex justify-between items-center shadow-lg z-20 relative">
          <button 
            onClick={goHome}
            className="group flex items-center gap-3 hover:bg-indigo-600 px-4 py-2 rounded-2xl transition-all border-b-4 border-indigo-700 active:border-b-0 active:translate-y-1"
          >
            <div className="bg-yellow-400 p-2 rounded-xl text-indigo-900 group-hover:rotate-12 transition-transform">
                <Trophy size={28} strokeWidth={2.5} /> 
            </div>
            <span className="font-bold text-2xl hidden md:block tracking-wide">Pembina Ayat</span>
          </button>

          {gameState === 'game' && (
             <div className="flex-1 max-w-md mx-4 md:mx-10 flex flex-col gap-1">
                <div className="flex justify-between text-xs md:text-sm font-bold text-indigo-100 uppercase tracking-widest">
                    <span>Tahap {currentStage}</span>
                    <span>{currentQuestionIndex + 1} / 10</span>
                </div>
                <div className="h-4 md:h-6 bg-indigo-800/50 rounded-full overflow-hidden p-1 shadow-inner">
                    <div 
                        className="h-full bg-gradient-to-r from-yellow-300 to-yellow-500 rounded-full transition-all duration-500 ease-out shadow-sm"
                        style={{ width: `${progress + 10}%` }}
                    ></div>
                </div>
             </div>
          )}

          <button 
            onClick={() => {
                setSoundEnabled(!soundEnabled);
                play('click');
            }}
            className="p-3 bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors border-b-4 border-indigo-800 active:border-b-0 active:translate-y-1"
          >
            {soundEnabled ? <Volume2 size={24} /> : <VolumeX size={24} />}
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col relative overflow-hidden">
            {/* Decorative Background Elements */}
            <div className="absolute top-10 left-10 w-32 h-32 bg-yellow-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-bounce-slight pointer-events-none"></div>
            <div className="absolute bottom-10 right-10 w-40 h-40 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-bounce-slight pointer-events-none" style={{animationDelay: '1s'}}></div>

          {/* 1. Main Menu */}
          {gameState === 'menu' && (
            <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-8 animate-fade-in z-10">
              <div className="text-center space-y-2">
                <h2 className="text-5xl md:text-7xl font-extrabold text-indigo-900 tracking-tight drop-shadow-sm">
                    Pilih Tahap
                </h2>
                <p className="text-xl md:text-2xl text-indigo-500 font-medium">Pilih tahap cabaran anda</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl px-4">
                {([1, 2, 3] as number[]).map((levelId) => {
                    const level = questionBanks[levelId];
                    return (
                        <button
                            key={levelId}
                            onClick={() => startLevel(levelId)}
                            className={`group relative flex flex-col items-center p-8 rounded-[2rem] bg-white border-4 border-slate-200 hover:border-indigo-400 shadow-xl transition-all transform hover:-translate-y-2 active:scale-95 active:translate-y-0`}
                        >
                            <div className={`mb-6 p-6 rounded-3xl ${level.color} shadow-lg group-hover:scale-110 transition-transform duration-300 rotate-3 group-hover:rotate-0`}>
                                {level.icon}
                            </div>
                            <h3 className="text-3xl font-extrabold text-slate-700 mb-2">{level.title}</h3>
                            <p className="text-slate-400 font-bold text-lg mb-4">{level.desc}</p>
                            
                            <div className={`mt-auto px-6 py-2 rounded-full bg-slate-100 text-slate-500 font-bold group-hover:bg-indigo-500 group-hover:text-white transition-colors`}>
                                MULA
                            </div>
                        </button>
                    )
                })}
              </div>

              <div className="bg-white/80 backdrop-blur border-2 border-indigo-100 p-6 rounded-2xl flex items-center gap-4 max-w-2xl shadow-sm">
                <div className="bg-indigo-100 p-3 rounded-full text-indigo-600">
                    <BookOpen size={32} />
                </div>
                <p className="text-indigo-800 text-lg md:text-xl font-bold">
                    <span className="text-indigo-500">TIP:</span> Kata Nama <ArrowRight className="inline mx-1" size={20}/> <span className="text-pink-500">Yang</span> <ArrowRight className="inline mx-1" size={20}/> Kata Adjektif / Kerja
                </p>
              </div>
            </div>
          )}

          {/* 2. Game Screen */}
          {gameState === 'game' && (
            <div className="flex-1 flex flex-col w-full max-w-4xl mx-auto p-4 md:p-8 animate-slide-up z-10">
              
              {/* Question Display */}
              <div className="flex-1 flex flex-col items-center justify-center min-h-[200px]">
                <div className={`mb-6 px-6 py-2 rounded-full text-lg md:text-xl font-extrabold text-white shadow-md flex items-center gap-3 animate-pop-in
                  ${getCurrentQuestion().type === 'adjective' ? 'bg-orange-400 rotate-2' : 'bg-blue-400 -rotate-2'}`}>
                  {getCurrentQuestion().type === 'adjective' ? <Star size={24} fill="currentColor"/> : <Zap size={24} fill="currentColor"/>}
                  {getCurrentQuestion().type === 'adjective' ? 'Kata Adjektif' : 'Kata Kerja'}
                </div>
                
                <h2 className="text-5xl md:text-7xl font-black text-slate-800 mb-4 text-center leading-tight drop-shadow-sm">
                  {getCurrentQuestion().zh}
                </h2>
              </div>

              {/* Sentence Building Area */}
              <div className={`min-h-[140px] bg-white rounded-3xl p-6 md:p-8 mb-8 flex flex-wrap gap-3 items-center justify-center border-4 transition-all shadow-inner relative
                ${feedback === 'correct' ? 'border-green-400 bg-green-50' : 
                  feedback === 'wrong' ? 'border-red-400 bg-red-50' : 
                  'border-slate-200'}`}>
                
                {userSentence.length === 0 && !feedback && (
                  <span className="text-slate-300 text-2xl md:text-3xl font-bold pointer-events-none select-none absolute animate-pulse">
                    Tekan perkataan di bawah...
                  </span>
                )}
                
                {userSentence.map((word, idx) => (
                  <button
                    key={`${word}-${idx}`}
                    onClick={() => handleSentenceClick(word, idx)}
                    className="px-6 py-4 md:px-8 md:py-5 bg-slate-800 text-white font-extrabold rounded-2xl shadow-[0_4px_0_rgb(15,23,42)] hover:bg-slate-700 hover:scale-105 active:shadow-none active:translate-y-1 transition-all animate-pop-in text-xl md:text-2xl whitespace-normal text-center"
                  >
                    {word}
                  </button>
                ))}
              </div>

              {/* Word Bank */}
              <div className="flex flex-wrap gap-4 justify-center mb-10 min-h-[100px]">
                {availableWords.map((word, idx) => (
                  <button
                    key={`${word}-${idx}`}
                    onClick={() => handleWordClick(word, idx)}
                    className="px-6 py-4 md:px-8 md:py-5 bg-white text-indigo-600 border-b-4 border-indigo-200 font-black rounded-2xl shadow-sm hover:border-indigo-400 hover:bg-indigo-50 hover:-translate-y-1 active:border-b-0 active:translate-y-1 active:bg-indigo-100 transition-all text-xl md:text-2xl whitespace-normal text-center"
                  >
                    {word}
                  </button>
                ))}
              </div>

              {/* Controls */}
              <div className="h-24 flex items-center justify-center">
                {!feedback ? (
                  <button
                    onClick={checkAnswer}
                    disabled={userSentence.length === 0}
                    className={`w-full max-w-md py-5 rounded-2xl font-black text-2xl md:text-3xl transition-all shadow-lg transform active:scale-95 border-b-4 
                      ${userSentence.length > 0 
                        ? 'bg-indigo-500 border-indigo-700 text-white hover:bg-indigo-600 hover:border-indigo-800 active:border-b-0 active:translate-y-1' 
                        : 'bg-slate-200 border-slate-300 text-slate-400 cursor-not-allowed'}`}
                  >
                    SEMAK JAWAPAN
                  </button>
                ) : (
                  <div className="w-full max-w-2xl animate-pop-in">
                    {feedback === 'correct' ? (
                      <button onClick={nextQuestion} className="w-full py-5 bg-green-500 border-b-4 border-green-700 text-white rounded-2xl font-black shadow-xl hover:bg-green-600 active:border-b-0 active:translate-y-1 transition-all flex items-center justify-center gap-4 text-3xl">
                        <Check size={36} strokeWidth={4} /> SOALAN SETERUSNYA
                      </button>
                    ) : (
                      <div className="flex flex-col md:flex-row gap-4 w-full">
                         <div className="flex-1 bg-red-100 p-4 rounded-2xl border-2 border-red-200 flex flex-col items-center justify-center">
                            <span className="text-red-500 font-bold mb-1 uppercase tracking-wider text-sm">JAWAPAN SEBENAR</span>
                            <span className="text-slate-800 font-black text-2xl">{getCurrentQuestion().ms}</span>
                         </div>
                         <button onClick={() => { play('click'); loadQuestion(currentStage, currentQuestionIndex); }} className="px-8 py-4 bg-slate-200 border-b-4 border-slate-300 text-slate-600 rounded-2xl hover:bg-slate-300 font-black text-xl transition-all active:border-b-0 active:translate-y-1">
                           <RotateCcw size={28} />
                         </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 3. Result Screen */}
          {gameState === 'result' && (
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8 animate-scale-in p-6 z-10">
              <div className="relative group">
                <div className={`w-48 h-48 rounded-full flex items-center justify-center shadow-2xl border-8 border-white
                  ${score >= 80 ? 'bg-gradient-to-br from-yellow-300 to-orange-400' : 'bg-slate-200'}`}>
                  <Trophy size={96} className={`filter drop-shadow-md ${score >= 80 ? 'text-white' : 'text-slate-400'}`} />
                </div>
                {score === 100 && (
                  <div className="absolute -top-4 -right-8 bg-red-500 text-white font-black px-6 py-2 rounded-full text-xl shadow-lg animate-bounce border-4 border-white rotate-12">
                    SEMPURNA!
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <h2 className="text-4xl md:text-6xl font-black text-indigo-900">
                  {questionBanks[currentStage].title} Selesai!
                </h2>
                <p className="text-indigo-400 text-xl md:text-2xl font-bold">
                  {score >= 80 ? 'Hebat! Anda memang pakar.' : 'Usaha yang bagus! Teruskan berlatih.'}
                </p>
              </div>

              <div className="bg-white/80 backdrop-blur-sm border-4 border-indigo-100 p-8 rounded-[2rem] w-full max-w-sm shadow-xl transform hover:scale-105 transition-transform">
                <div className="text-lg text-indigo-300 uppercase tracking-widest font-black mb-2">JUMLAH MARKAH</div>
                <div className="text-8xl font-black text-indigo-600 tracking-tighter drop-shadow-sm">{score}</div>
              </div>

              <div className="flex flex-col gap-4 w-full max-w-sm">
                {currentStage < 3 && score >= 60 && (
                   <button 
                   onClick={() => startLevel(currentStage + 1)}
                   className="w-full px-8 py-5 bg-green-500 border-b-4 border-green-700 text-white rounded-2xl font-black hover:bg-green-600 active:border-b-0 active:translate-y-1 transition-all flex items-center justify-center gap-3 shadow-xl text-2xl"
                 >
                   Tahap Seterusnya <ArrowRight size={28} strokeWidth={3} />
                 </button>
                )}
                
                <button 
                  onClick={() => startLevel(currentStage)}
                  className="w-full px-8 py-4 bg-white border-b-4 border-slate-200 text-slate-600 rounded-2xl font-black hover:bg-slate-50 active:border-b-0 active:translate-y-1 transition-all flex items-center justify-center gap-3 text-xl"
                >
                  <RotateCcw size={24} strokeWidth={3} /> Main Semula
                </button>
                
                <button 
                  onClick={goHome}
                  className="w-full px-8 py-4 text-indigo-400 hover:text-indigo-600 font-bold text-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Home size={20} /> Menu Utama
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default YangBuilder;