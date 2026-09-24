import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

// --- ТИПЫ ---
interface Tile {
  letter: string;
  used: boolean;
  id: number;
}

interface Level {
  letters: string;
  words: string[];
}

// --- ДАННЫЕ УРОВНЕЙ ---
// Все слова простые, бытовые и часто используются в жизни
const gameLevels: Level[] = [
  {
    letters: "ШКОЛА",
    words: ["ШОК", "КОЛ", "КОШ", "ЛАК", "КОЛА", "ШАЛ"]
  },
  {
    letters: "ДОМИК",
    words: ["ДОМ", "КОД", "КОМ", "МОК", "ДОК", "ДОМИК"]
  },
  {
    letters: "КАРТА",
    words: ["КАР", "ТАР", "РАК", "АРТ", "ТАРА", "КАРТА", "АРКА"]
  },
  {
    letters: "КОРОВА",
    words: ["КОР", "РОВ", "ОКА", "ВАР", "РАК", "КОРОВА", "ВОР"]
  },
  {
    letters: "МАСКА",
    words: ["МАС", "САМ", "МАК", "МАСКА", "КАМА"]
  },
  {
    letters: "МОЛОКО",
    words: ["МОЛ", "КОЛ", "ЛОМ", "КОМ", "ОКО", "МОЛОКО", "ОКОМ"]
  },
  {
    letters: "РАДИО",
    words: ["РАД", "ДАР", "РОД", "ИОД", "АИД"]
  }
];

// --- УТИЛИТЫ ---
function canFormWord(availableLetters: string, word: string): boolean {
  const letterCounts: Record<string, number> = {};
  for (const char of availableLetters) {
    letterCounts[char] = (letterCounts[char] || 0) + 1;
  }
  const wordCounts: Record<string, number> = {};
  for (const char of word) {
    wordCounts[char] = (wordCounts[char] || 0) + 1;
  }
  for (const char in wordCounts) {
    if (!letterCounts[char] || wordCounts[char] > letterCounts[char]) {
      return false;
    }
  }
  return true;
}

function validateDictionary(availableLetters: string, words: string[]): string[] {
  return words.filter(word => canFormWord(availableLetters, word));
}

// --- КОМПОНЕНТ ---
export default function App() {
  const [currentLevelIndex, setCurrentLevelIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'hint' | ''>('');
  const [showWinModal, setShowWinModal] = useState(false);
  const [revealedFirstLetters, setRevealedFirstLetters] = useState<string[]>([]);
  const [revealedLengths, setRevealedLengths] = useState<string[]>([]);
  const [shakeWord, setShakeWord] = useState(false);
  const [hintTiles, setHintTiles] = useState<number[]>([]);
  
  const messageTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hintTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Refs для актуальных значений в обработчиках
  const selectedIndicesRef = useRef(selectedIndices);
  const foundWordsRef = useRef(foundWords);
  const tilesRef = useRef(tiles);
  const streakRef = useRef(streak);
  const showWinModalRef = useRef(showWinModal);
  
  useEffect(() => { selectedIndicesRef.current = selectedIndices; }, [selectedIndices]);
  useEffect(() => { foundWordsRef.current = foundWords; }, [foundWords]);
  useEffect(() => { tilesRef.current = tiles; }, [tiles]);
  useEffect(() => { streakRef.current = streak; }, [streak]);
  useEffect(() => { showWinModalRef.current = showWinModal; }, [showWinModal]);

  const currentLevel = gameLevels[currentLevelIndex];
  
  const validWords = useMemo(() => {
    return validateDictionary(currentLevel.letters, currentLevel.words);
  }, [currentLevelIndex]);

  // Инициализация уровня
  useEffect(() => {
    const level = gameLevels[currentLevelIndex];
    const valid = validateDictionary(level.letters, level.words);
    
    const newTiles: Tile[] = level.letters.split('').map((letter, index) => ({
      letter,
      used: false,
      id: index
    }));
    
    setTiles(newTiles);
    setSelectedIndices([]);
    setFoundWords([]);
    setStreak(0);
    setRevealedFirstLetters([]);
    setRevealedLengths([]);
    setHintTiles([]);
    setMessage('');
    setMessageType('');
    setShowWinModal(false);
    
    // Обновляем слова уровня на валидные
    gameLevels[currentLevelIndex] = { ...level, words: valid };
  }, [currentLevelIndex]);

  const showMessage = useCallback((text: string, type: 'success' | 'error' | 'hint') => {
    if (messageTimeoutRef.current) clearTimeout(messageTimeoutRef.current);
    setMessage(text);
    setMessageType(type);
    if (type === 'error') {
      setShakeWord(true);
      setTimeout(() => setShakeWord(false), 500);
    }
    messageTimeoutRef.current = setTimeout(() => {
      setMessage('');
      setMessageType('');
    }, 3000);
  }, []);

  const clearWord = useCallback(() => {
    setTiles(prev => prev.map(t => ({ ...t, used: false })));
    setSelectedIndices([]);
    setHintTiles([]);
    setMessage('');
    setMessageType('');
  }, []);

  const handleTileClick = useCallback((index: number) => {
    // Используем ref для проверки актуального состояния
    if (tilesRef.current[index].used) return;
    
    setTiles(prev => prev.map((t, i) => i === index ? { ...t, used: true } : t));
    setSelectedIndices(prev => {
      // Защита от дубликатов при быстрых кликах
      if (prev.includes(index)) return prev;
      return [...prev, index];
    });
    setHintTiles([]);
    setMessage('');
    setMessageType('');
  }, []);

  const removeLastLetter = useCallback(() => {
    const indices = selectedIndicesRef.current;
    if (indices.length === 0) return;
    const lastIdx = indices[indices.length - 1];
    setTiles(prev => prev.map((tile, i) => i === lastIdx ? { ...tile, used: false } : tile));
    setSelectedIndices(prev => prev.slice(0, -1));
  }, []);

  const checkWord = useCallback(() => {
    const indices = selectedIndicesRef.current;
    const currentTiles = tilesRef.current;
    const found = foundWordsRef.current;
    const word = indices.map(i => currentTiles[i].letter).join('');
    
    if (word.length < 3) {
      showMessage('Слово слишком короткое! (мин. 3 буквы)', 'error');
      return;
    }

    if (found.includes(word)) {
      showMessage('Это слово уже найдено!', 'error');
      return;
    }

    const valid = validateDictionary(
      gameLevels[currentLevelIndex].letters,
      gameLevels[currentLevelIndex].words
    );

    if (valid.includes(word)) {
      // Правильное слово
      setFoundWords(prev => {
        const newFound = [...prev, word];
        // Проверяем победу
        if (newFound.length === valid.length) {
          setTimeout(() => setShowWinModal(true), 800);
        }
        return newFound;
      });
      
      const currentStreak = streakRef.current + 1;
      setStreak(currentStreak);
      
      let points = 10 + (word.length * 2);
      if (currentStreak > 1) points += currentStreak * 2;
      
      // Штраф за подсказки
      if (revealedFirstLetters.includes(word)) {
        points = Math.max(1, Math.floor(points * 0.5));
      }
      if (revealedLengths.includes(word)) {
        points = Math.max(1, Math.floor(points * 0.7));
      }

      setScore(prev => prev + points);
      showMessage(`+${points} очков! ${currentStreak > 1 ? `🔥 Серия x${currentStreak}` : ''}`, 'success');
      
      if (foundWords.length + 1 < valid.length) {
        setTimeout(clearWord, 600);
      }
    } else {
      setStreak(0);
      showMessage('Такого слова нет в списке!', 'error');
      setTimeout(clearWord, 600);
    }
  }, [currentLevelIndex, showMessage, clearWord, revealedFirstLetters, revealedLengths, foundWords.length]);

  // Обработка клавиатуры
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showWinModalRef.current) {
        if (e.key === 'Enter') {
          if (currentLevelIndex >= gameLevels.length - 1) {
            setCurrentLevelIndex(0);
            setScore(0);
          } else {
            setCurrentLevelIndex(prev => prev + 1);
          }
        }
        return;
      }

      const key = e.key.toUpperCase();
      
      if (e.key === 'Enter') {
        checkWord();
      } else if (e.key === 'Backspace') {
        removeLastLetter();
      } else if (e.key === 'Escape') {
        clearWord();
      } else if (/^[А-ЯЁ]$/.test(key)) {
        const tileIndex = tilesRef.current.findIndex(t => !t.used && t.letter === key);
        if (tileIndex !== -1) {
          handleTileClick(tileIndex);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [checkWord, removeLastLetter, clearWord, handleTileClick, currentLevelIndex]);

  // --- ПОДСКАЗКИ ---
  
  const getRemainingWords = useCallback(() => {
    return validWords.filter(w => !foundWords.includes(w));
  }, [validWords, foundWords]);

  // Подсказка 1: Показать первую букву (-10 очков)
  const hintFirstLetter = useCallback(() => {
    const remaining = getRemainingWords();
    if (remaining.length === 0) return;
    
    // Выбираем самое длинное ненайденное слово
    const sorted = [...remaining].sort((a, b) => b.length - a.length);
    let targetWord = sorted[0];
    
    // Если первая буква уже показана, берём следующее
    if (revealedFirstLetters.includes(targetWord)) {
      const other = remaining.find(w => !revealedFirstLetters.includes(w));
      if (other) {
        targetWord = other;
      } else {
        showMessage('Все первые буквы уже открыты!', 'hint');
        return;
      }
    }
    
    setRevealedFirstLetters(prev => [...prev, targetWord]);
    setScore(prev => Math.max(0, prev - 10));
    showMessage(`💡 Первая буква слова из ${targetWord.length} букв: «${targetWord[0]}_» (-10 очков)`, 'hint');
  }, [getRemainingWords, revealedFirstLetters, showMessage]);

  // Подсказка 2: Показать длину слова (-5 очков)
  const hintWordLength = useCallback(() => {
    const remaining = getRemainingWords();
    if (remaining.length === 0) return;
    
    // Показываем длину слова, которое ещё не было раскрыто
    const unrevealed = remaining.filter(w => !revealedLengths.includes(w));
    const targetWord = unrevealed.length > 0 ? unrevealed[0] : remaining[0];
    
    if (revealedLengths.includes(targetWord)) {
      const other = remaining.find(w => !revealedLengths.includes(w));
      if (other) {
        setRevealedLengths(prev => [...prev, other]);
        setScore(prev => Math.max(0, prev - 5));
        showMessage(`💡 Есть слово из ${other.length} букв (-5 очков)`, 'hint');
        return;
      }
      showMessage('Длины всех слов уже показаны!', 'hint');
      return;
    }
    
    setRevealedLengths(prev => [...prev, targetWord]);
    setScore(prev => Math.max(0, prev - 5));
    showMessage(`💡 Есть слово из ${targetWord.length} букв (-5 очков)`, 'hint');
  }, [getRemainingWords, revealedLengths, showMessage]);

  // Подсказка 3: Подсветить плитки (-15 очков)
  const hintHighlightTiles = useCallback(() => {
    const remaining = getRemainingWords();
    if (remaining.length === 0) return;
    
    // Выбираем слово для подсветки
    const targetWord = remaining[Math.floor(Math.random() * remaining.length)];
    
    // Находим плитки, которые составляют это слово
    const neededLetters: Record<string, number> = {};
    for (const char of targetWord) {
      neededLetters[char] = (neededLetters[char] || 0) + 1;
    }
    
    const tileIndices: number[] = [];
    const usedForHint: Record<string, number> = {};
    
    tiles.forEach((tile, idx) => {
      if (!tile.used && neededLetters[tile.letter] > 0) {
        const alreadyUsed = usedForHint[tile.letter] || 0;
        if (alreadyUsed < neededLetters[tile.letter]) {
          tileIndices.push(idx);
          usedForHint[tile.letter] = alreadyUsed + 1;
        }
      }
    });
    
    if (tileIndices.length > 0) {
      if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
      setHintTiles(tileIndices);
      setScore(prev => Math.max(0, prev - 15));
      showMessage(`✨ Подсвечены буквы для слова из ${targetWord.length} букв (-15 очков)`, 'hint');
      
      hintTimeoutRef.current = setTimeout(() => setHintTiles([]), 3000);
    }
  }, [getRemainingWords, tiles, showMessage]);

  const nextLevel = useCallback(() => {
    if (currentLevelIndex >= gameLevels.length - 1) {
      setCurrentLevelIndex(0);
      setScore(0);
    } else {
      setCurrentLevelIndex(prev => prev + 1);
    }
  }, [currentLevelIndex]);

  // Прогресс
  const progress = validWords.length > 0 ? (foundWords.length / validWords.length) * 100 : 0;

  return (
    <div className="min-h-screen font-['Nunito',sans-serif] bg-gradient-to-br from-[#fff5eb] via-[#ffebee] to-[#e1f5fe] text-[#5d4037] flex flex-col overflow-x-hidden">
      {/* Header */}
      <header className="text-center py-5 relative">
        <div className="w-[100px] h-[100px] mx-auto my-5" style={{ perspective: '600px' }}>
          <div className="w-full h-full relative animate-[rotateCube_10s_infinite_linear]" style={{ transformStyle: 'preserve-3d' }}>
            {['С', 'Л', 'О', 'В', 'О', '!'].map((letter, i) => {
              const transforms = [
                'rotateY(0deg) translateZ(50px)',
                'rotateY(180deg) translateZ(50px)',
                'rotateY(90deg) translateZ(50px)',
                'rotateY(-90deg) translateZ(50px)',
                'rotateX(90deg) translateZ(50px)',
                'rotateX(-90deg) translateZ(50px)',
              ];
              return (
                <div
                  key={i}
                  className="absolute w-[100px] h-[100px] border-2 border-[#ffab91] flex items-center justify-center text-4xl font-bold text-[#5d4037] bg-white/90 rounded-[15px] shadow-[0_0_15px_rgba(255,171,145,0.4)]"
                  style={{ transform: transforms[i] }}
                >
                  {letter}
                </div>
              );
            })}
          </div>
        </div>
        <h1 className="text-4xl font-black text-[#ef6c00] animate-[floatTitle_3s_ease-in-out_infinite]">
          Угадай слово
        </h1>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-[800px] mx-auto w-full px-5 flex flex-col items-center">
        {/* Game Info */}
        <div className="flex justify-between w-full bg-white py-4 px-6 rounded-[20px] shadow-[0_10px_20px_rgba(93,64,55,0.1)] mb-5 font-bold text-xl text-[#795548]">
          <div>Уровень: <span className="text-[#ab47bc] text-2xl">{currentLevelIndex + 1}</span></div>
          <div>Очки: <span className="text-[#ef6c00] text-2xl">{score}</span></div>
        </div>

        {/* Message */}
        <div className={`h-8 mb-3 font-bold text-center transition-all ${
          messageType === 'error' ? 'text-[#ef5350]' : 
          messageType === 'success' ? 'text-[#43a047]' : 
          messageType === 'hint' ? 'text-[#8e24aa]' : 'text-transparent'
        }`}>
          {message || '\u00A0'}
        </div>

        {/* Word Display */}
        <div className={`flex gap-2.5 min-h-[60px] mb-8 flex-wrap justify-center ${shakeWord ? 'animate-[shake_0.5s]' : ''}`}>
          {selectedIndices.map((idx, i) => (
            <div
              key={`${idx}-${i}`}
              className="w-[50px] h-[50px] bg-white border-2 border-dashed border-[#ffccbc] rounded-xl flex justify-center items-center text-2xl font-black text-[#5d4037] animate-[popIn_0.3s_cubic-bezier(0.175,0.885,0.32,1.275)]"
            >
              {tiles[idx]?.letter}
            </div>
          ))}
          {selectedIndices.length === 0 && (
            <div className="text-gray-400 text-lg self-center">Нажимай на буквы...</div>
          )}
        </div>

        {/* Tiles */}
        <div className="flex flex-wrap justify-center gap-4 mb-8 max-w-[600px]">
          {tiles.map((tile, idx) => (
            <div
              key={idx}
              onClick={() => handleTileClick(idx)}
              className={`w-[60px] h-[60px] rounded-[15px] flex justify-center items-center text-3xl font-black cursor-pointer select-none transition-all duration-100
                ${tile.used 
                  ? 'bg-[#eceff1] text-[#b0bec5] shadow-[inset_0_2px_5px_rgba(0,0,0,0.1)] cursor-default' 
                  : 'bg-white text-[#5d4037] shadow-[0_4px_0_#ffccbc] hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-[0_2px_0_#ffccbc]'
                }
                ${hintTiles.includes(idx) ? 'animate-[pulseHint_1s_infinite] bg-[#fff9c4] border-2 border-[#fbc02d]' : ''}
              `}
            >
              {tile.letter}
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className="flex gap-3 mb-8 flex-wrap justify-center">
          <button
            onClick={clearWord}
            className="px-5 py-3 border-none rounded-full font-bold text-sm cursor-pointer transition-transform active:scale-95 shadow-[0_4px_10px_rgba(0,0,0,0.1)] bg-gradient-to-r from-[#ffa726] to-[#fb8c00] text-white"
          >
            Очистить
          </button>
          
          {/* Подсказки */}
          <div className="flex gap-2 flex-wrap justify-center">
            <button
              onClick={hintFirstLetter}
              className="px-4 py-3 border-none rounded-full font-bold text-xs cursor-pointer transition-transform active:scale-95 shadow-[0_4px_10px_rgba(0,0,0,0.1)] bg-gradient-to-r from-[#ab47bc] to-[#8e24aa] text-white relative"
              title="Показать первую букву ненайденного слова (-10 очков)"
            >
              💡 Буква
              <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[0.6rem] px-1.5 py-0.5 rounded-full font-bold">-10</span>
            </button>
            
            <button
              onClick={hintWordLength}
              className="px-4 py-3 border-none rounded-full font-bold text-xs cursor-pointer transition-transform active:scale-95 shadow-[0_4px_10px_rgba(0,0,0,0.1)] bg-gradient-to-r from-[#7c4dff] to-[#651fff] text-white relative"
              title="Показать длину ненайденного слова (-5 очков)"
            >
              🔢 Длина
              <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[0.6rem] px-1.5 py-0.5 rounded-full font-bold">-5</span>
            </button>
            
            <button
              onClick={hintHighlightTiles}
              className="px-4 py-3 border-none rounded-full font-bold text-xs cursor-pointer transition-transform active:scale-95 shadow-[0_4px_10px_rgba(0,0,0,0.1)] bg-gradient-to-r from-[#e040fb] to-[#aa00ff] text-white relative"
              title="Подсветить плитки для составления слова (-15 очков)"
            >
              ✨ Плитки
              <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[0.6rem] px-1.5 py-0.5 rounded-full font-bold">-15</span>
            </button>
          </div>

          <button
            onClick={checkWord}
            className="px-5 py-3 border-none rounded-full font-bold text-sm cursor-pointer transition-transform active:scale-95 shadow-[0_4px_10px_rgba(0,0,0,0.1)] bg-gradient-to-r from-[#66bb6a] to-[#43a047] text-white"
          >
            Проверить ✓
          </button>
        </div>

        {/* Progress */}
        <div className="w-full bg-white/50 rounded-[20px] h-5 mb-5 overflow-hidden shadow-[inset_0_2px_5px_rgba(0,0,0,0.05)]">
          <div
            className="h-full bg-gradient-to-r from-[#ffcc80] to-[#ffab91] rounded-[20px] transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="w-full text-center font-bold text-[#8d6e63] mb-2">
          Найдено: <span className="text-[#ef6c00]">{foundWords.length}</span> / <span>{validWords.length}</span>
        </div>

        {/* Words List */}
        <div className="grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-2.5 w-full mt-5">
          {validWords.map((word, idx) => {
            const isFound = foundWords.includes(word);
            const isFirstLetterRevealed = revealedFirstLetters.includes(word);
            const isLengthRevealed = revealedLengths.includes(word);
            
            let displayText = '';
            if (isFound) {
              displayText = word;
            } else if (isFirstLetterRevealed) {
              displayText = word[0] + '•'.repeat(word.length - 1);
            } else {
              displayText = '•'.repeat(word.length);
            }
            
            return (
              <div
                key={idx}
                className={`bg-white py-2 px-2 rounded-xl text-center font-bold text-sm shadow-[0_2px_5px_rgba(0,0,0,0.05)] transition-all duration-300
                  ${isFound ? 'text-[#2e7d32] bg-[#e8f5e9] scale-105' : 'text-[#b0bec5]'}
                  ${isFirstLetterRevealed && !isFound ? 'text-[#8e24aa] bg-[#f3e5f5]' : ''}
                `}
              >
                {displayText}
                {isLengthRevealed && !isFound && !isFirstLetterRevealed && (
                  <span className="block text-[0.6rem] text-[#7c4dff] mt-0.5">{word.length} букв</span>
                )}
                {isFirstLetterRevealed && !isFound && (
                  <span className="block text-[0.6rem] text-[#ab47bc] mt-0.5">первая: {word[0]}</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Info Section */}
        <div className="mt-12 bg-white/60 p-8 rounded-[20px] w-full box-border">
          <h3 className="text-[#8e24aa] text-xl font-bold mb-4">Как играть?</h3>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-5 mt-5">
            <div className="bg-white p-4 rounded-2xl shadow-[0_4px_10px_rgba(0,0,0,0.05)]">
              <strong>🧩 Собирай слова</strong>
              <p className="mt-1 text-sm">Кликай по буквам или используй клавиатуру, чтобы составить слово.</p>
            </div>
            <div className="bg-white p-4 rounded-2xl shadow-[0_4px_10px_rgba(0,0,0,0.05)]">
              <strong>✅ Проверяй</strong>
              <p className="mt-1 text-sm">Нажми "Проверить" или Enter. Короткие слова (менее 3 букв) не считаются.</p>
            </div>
            <div className="bg-white p-4 rounded-2xl shadow-[0_4px_10px_rgba(0,0,0,0.05)]">
              <strong>💰 Очки и серии</strong>
              <p className="mt-1 text-sm">Длинные слова дают больше очков. Серия правильных ответов — бонус!</p>
            </div>
            <div className="bg-white p-4 rounded-2xl shadow-[0_4px_10px_rgba(0,0,0,0.05)]">
              <strong>💡 Подсказки</strong>
              <p className="mt-1 text-sm">3 типа подсказок с разной стоимостью. Если использовал подсказку для слова — очки за него снижаются!</p>
            </div>
          </div>
        </div>

        {/* Обратная связь */}
        <div className="mt-8 mb-12 w-full flex flex-col items-center">
          <a
            href="https://docs.google.com/forms/d/e/1FAIpQLSfhCus-2jCHuhyRteGpFJ83rW_deEx61DiMZP2dqiTCf-g0Lw/viewform?usp=header"
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-3 px-8 py-4 rounded-full font-bold text-base cursor-pointer transition-all duration-300 shadow-[0_6px_15px_rgba(0,0,0,0.12)] bg-gradient-to-r from-[#42a5f5] via-[#5c6bc0] to-[#7e57c2] text-white hover:shadow-[0_8px_25px_rgba(94,53,177,0.35)] hover:-translate-y-1 active:translate-y-0 active:scale-95 no-underline"
          >
            <span className="text-2xl transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110">💬</span>
            <span>Обратная связь</span>
            <span className="text-lg transition-transform duration-300 group-hover:translate-x-1">↗</span>
          </a>
          <p className="mt-3 text-sm text-[#8d6e63] text-center">
            Нашли баг или хотите предложить идею? Напишите нам! 🙌
          </p>
        </div>
      </main>

      {/* Win Modal */}
      {showWinModal && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex justify-center items-center z-[1000]">
          <div className="bg-white p-10 rounded-[30px] text-center shadow-[0_20px_50px_rgba(0,0,0,0.15)] max-w-[400px] w-[90%] border-[5px] border-[#ffab91] animate-[popIn_0.4s_cubic-bezier(0.175,0.885,0.32,1.275)]">
            <h2 className="text-[#ef6c00] text-2xl font-bold mt-0">Уровень пройден! 🎉</h2>
            <p className="text-xl my-5">Ты нашел все слова!</p>
            <p>Текущий счет: <strong className="text-[#ef6c00] text-2xl">{score}</strong></p>
            <button
              onClick={nextLevel}
              className="mt-5 px-10 py-4 border-none rounded-full font-bold text-xl cursor-pointer transition-transform active:scale-95 shadow-[0_4px_10px_rgba(0,0,0,0.1)] bg-gradient-to-r from-[#42a5f5] to-[#1e88e5] text-white"
            >
              {currentLevelIndex >= gameLevels.length - 1 ? '🔄 Начать заново' : 'Следующий уровень →'}
            </button>
          </div>
        </div>
      )}

      {/* Плавающая кнопка обратной связи */}
      <a
        href="https://docs.google.com/forms/d/e/1FAIpQLSfhCus-2jCHuhyRteGpFJ83rW_deEx61DiMZP2dqiTCf-g0Lw/viewform?usp=header"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-[999] flex items-center gap-2 px-5 py-3 rounded-full font-bold text-sm transition-all duration-300 shadow-[0_6px_20px_rgba(94,53,177,0.3)] bg-gradient-to-r from-[#42a5f5] via-[#5c6bc0] to-[#7e57c2] text-white hover:shadow-[0_8px_30px_rgba(94,53,177,0.5)] hover:-translate-y-1 active:translate-y-0 active:scale-95 no-underline animate-[floatBtn_3s_ease-in-out_infinite]"
        title="Обратная связь"
      >
        <span className="text-xl">💬</span>
        <span className="hidden sm:inline">Обратная связь</span>
      </a>

      {/* CSS Animations */}
      <style>{`
        @keyframes rotateCube {
          from { transform: rotateX(-15deg) rotateY(0deg); }
          to { transform: rotateX(-15deg) rotateY(360deg); }
        }
        @keyframes floatTitle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        @keyframes popIn {
          from { transform: scale(0); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes pulseHint {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(251, 192, 45, 0.7); }
          50% { transform: scale(1.15); box-shadow: 0 0 15px 5px rgba(251, 192, 45, 0.4); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(251, 192, 45, 0); }
        }
        @keyframes shake {
          0% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          50% { transform: translateX(10px); }
          75% { transform: translateX(-10px); }
          100% { transform: translateX(0); }
        }
        @keyframes floatBtn {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
      `}</style>
    </div>
  );
}
