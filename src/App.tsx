import React, { useState, useRef, useEffect } from 'react';
import './App.css'; // Importar o arquivo CSS

const App: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [text, setText] = useState('Insira seu texto aqui...');
  const [fontSize, setFontSize] = useState(30);
  const [scrollSpeed, setScrollSpeed] = useState(5); // Ajustável para controlar a velocidade de rolagem
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [timeElapsed, setTimeElapsed] = useState(0); // Contador de tempo
  const [isNearLimit, setIsNearLimit] = useState(false); // Para piscar as bordas
  const videoRef = useRef<HTMLVideoElement>(null);
  const textContainerRef = useRef<HTMLDivElement>(null); // Referência para o contêiner do texto
  const intervalRef = useRef<NodeJS.Timeout | null>(null); // Referência para o intervalo de rolagem

  useEffect(() => {
    if (isRecording && videoRef.current) {
      navigator.mediaDevices.getUserMedia({ video: { aspectRatio: 9 / 16 } }) // Garantir proporção 9:16
        .then(stream => {
          videoRef.current!.srcObject = stream;
          setStream(stream);
          const recorder = new MediaRecorder(stream);
          recorder.ondataavailable = (e) => {
            setVideoUrl(URL.createObjectURL(e.data));
          };
          recorder.start();
          setMediaRecorder(recorder);
        })
        .catch(err => console.error('Erro ao acessar webcam:', err));
    } else if (mediaRecorder && stream) {
      mediaRecorder.stop();
      stream.getTracks().forEach(track => track.stop());
    }
  }, [isRecording]);

  // Controle do tempo
  useEffect(() => {
    if (isRecording) {
      intervalRef.current = setInterval(() => {
        setTimeElapsed((prevTime) => {
          if (prevTime >= 55) {
            setIsNearLimit(true); // Ativar a animação de bordas vermelhas/brancas
          } else {
            setIsNearLimit(false);
          }
          return prevTime + 1;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current!);
    }
    return () => clearInterval(intervalRef.current!);
  }, [isRecording]);

  // Função para iniciar a rolagem do texto
  useEffect(() => {
    let scrollInterval: NodeJS.Timeout = null!; // Exatamente como solicitado

    if (textContainerRef.current) {
      const textContainer = textContainerRef.current;
      textContainer.scrollTop = 0; // Garantir que a rolagem comece do topo

      if (isRecording) {
        scrollInterval = setInterval(() => {
          textContainer.scrollTop += scrollSpeed; // Ajusta a rolagem verticalmente conforme a velocidade
        }, 100); // Intervalo de rolagem
      } else if (scrollInterval) {
        clearInterval(scrollInterval);
      }
    }

    return () => scrollInterval && clearInterval(scrollInterval);
  }, [isRecording, scrollSpeed]);

  const handleStartRecording = () => {
    setIsRecording(true);
    setTimeElapsed(0); // Reiniciar o tempo ao iniciar a gravação
  };
  const handleStopRecording = () => {
    setIsRecording(false);
    setIsNearLimit(false); // Parar a animação de piscar as bordas ao parar a gravação
  };

  // Função para ajustar o texto para não quebrar palavras e limitar a 4 linhas
  const getAdjustedText = (text: string, maxWidth: number) => {
    const words = text.split(' ');
    let result = '';
    let currentLine = '';

    words.forEach((word) => {
      const potentialLine = currentLine ? `${currentLine} ${word}` : word;
      if (potentialLine.length <= maxWidth) {
        currentLine = potentialLine;
      } else {
        result += currentLine + '\n';
        currentLine = word;
      }
    });

    result += currentLine;
    const lines = result.split('\n');
    return lines.slice(0, 4).join('\n'); // Limitar a 4 linhas
  };

  // Limitar o texto a 90% da largura da tela ou 40 caracteres por linha
  const adjustedText = getAdjustedText(text, 40);

  return (
    <div className="app-container">
      <div className="video-wrapper">
        {/* Vídeo */}
        <video
          ref={videoRef}
          className={`video-element ${isNearLimit ? 'blink-border' : ''}`}
          autoPlay
          muted
        />
        {/* Contador de tempo */}
        <div className="time-counter">
          <h3>Tempo de Gravação: {timeElapsed}s</h3>
        </div>
        {/* Contêiner do texto do teleprompter */}
        <div
          ref={textContainerRef}
          className="teleprompter-container"
          style={{ fontSize: `${fontSize}px` }}
        >
          <div className="teleprompter-text">
            {adjustedText}
          </div>
        </div>
        {/* Alerta do tempo limite atingido */}
        {timeElapsed >= 60 && (
          <div className="time-limit-warning">
            <p>O tempo máximo de gravação de 60 segundos foi atingido!</p>
          </div>
        )}
      </div>

      <div style={{ marginTop: '20px' }}>
        <button onClick={handleStartRecording} disabled={isRecording}>
          Iniciar Gravação
        </button>
        <button onClick={handleStopRecording} disabled={!isRecording}>
          Parar Gravação
        </button>

        {videoUrl && (
          <div>
            <video src={videoUrl} controls style={{ marginTop: '20px', width: '100%', maxWidth: '480px' }} />
            <a href={videoUrl} download="video.mp4">Baixar Vídeo</a>
          </div>
        )}
      </div>

      <div style={{ marginTop: '20px' }}>
        <label>
          Texto:
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            style={{ width: '100%', maxWidth: '480px' }}
          />
        </label>
        <label>
          Tamanho da Fonte:
          <input
            type="range"
            min="10"
            max="100"
            value={fontSize}
            onChange={(e) => setFontSize(parseInt(e.target.value, 10))}
          />
        </label>
        <label>
          Velocidade do Rolamento:
          <input
            type="range"
            min="1"
            max="10"
            value={scrollSpeed}
            onChange={(e) => setScrollSpeed(parseInt(e.target.value, 10))}
          />
        </label>
      </div>
    </div>
  );
};

export default App;
