import React, { useState, useRef, useEffect } from 'react';
import './App.css';

const App: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [text, setText] = useState('Insira seu texto aqui...');
  const [fontSize, setFontSize] = useState(20);
  const [scrollSpeed, setScrollSpeed] = useState(0.40); // Velocidade reduzida pela metade
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isNearLimit, setIsNearLimit] = useState(false); // Borda piscando ao se aproximar do limite de tempo
  const [scrollPosition, setScrollPosition] = useState(0); // Posição da rolagem
  const videoRef = useRef<HTMLVideoElement>(null);
  const textRef = useRef<HTMLDivElement>(null); // Referência para o contêiner do texto
  const intervalRef = useRef<NodeJS.Timeout | null>(null); // Intervalo para a rolagem

  // Função para lidar com o evento da roda do mouse (controle de velocidade)
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setScrollSpeed((prev) => Math.min(prev + 0.05, 0.9)); // Aumentar a velocidade até o máximo de 0.9
    } else {
      setScrollSpeed((prev) => Math.max(prev - 0.05, 0.1)); // Diminuir a velocidade até o mínimo de 0.1
    }
  };

  // Função para controlar a gravação e capturar o vídeo
  useEffect(() => {
    if (isRecording && videoRef.current) {
      navigator.mediaDevices.getUserMedia({ video: { aspectRatio: 9 / 16 }, audio: true })
        .then(stream => {
          videoRef.current!.srcObject = stream;
          setStream(stream);

          const recorder = new MediaRecorder(stream, { mimeType: 'video/webm; codecs=vp9,opus' });
          const chunks: Blob[] = [];

          recorder.ondataavailable = (e) => {
            chunks.push(e.data);
          };

          recorder.onstop = () => {
            const completeBlob = new Blob(chunks, { type: 'video/webm' });
            const webmUrl = URL.createObjectURL(completeBlob);
            setVideoUrl(webmUrl); // Mostrar o vídeo gravado
          };

          recorder.start();
          setMediaRecorder(recorder);
        })
        .catch(err => console.error('Erro ao acessar a webcam e microfone:', err));
    } else if (mediaRecorder && stream) {
      mediaRecorder.stop();
      stream.getTracks().forEach(track => track.stop());
    }
  }, [isRecording]);

  // Controle do tempo de gravação
  useEffect(() => {
    if (isRecording) {
      intervalRef.current = setInterval(() => {
        setTimeElapsed((prevTime) => {
          if (prevTime >= 55) {
            setIsNearLimit(true); // Ativar animação de bordas piscando
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

  // Função para controlar a rolagem do texto
  useEffect(() => {
    let scrollInterval: NodeJS.Timeout;

    if (isRecording && textRef.current) {
      const totalScrollHeight = textRef.current.scrollHeight;
      const visibleHeight = textRef.current.clientHeight;

      setScrollPosition(0); // Resetar a rolagem

      // Pausa de 3.7 segundos antes de começar a rolar
      setTimeout(() => {
        scrollInterval = setInterval(() => {
          setScrollPosition((prev) => {
            const newPosition = prev - scrollSpeed; // Atualizar a posição de rolagem
            const stopPosition = -(totalScrollHeight - visibleHeight); // Calcular o limite de rolagem

            if (newPosition <= stopPosition) {
              clearInterval(scrollInterval); // Parar a rolagem ao atingir o limite
              return stopPosition;
            }

            return newPosition;
          });
        }, 50); // Intervalo para suavizar a rolagem
      }, 3700); // Pausa de 3.7 segundos antes de iniciar a rolagem
    }

    return () => clearInterval(scrollInterval);
  }, [isRecording, scrollSpeed]);

  const handleStartRecording = () => {
    setIsRecording(true);
    setTimeElapsed(0); // Reiniciar o contador de gravação
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    setIsNearLimit(false); // Parar a animação de bordas piscando
  };

  return (
    <div className="app-container">
      <div
        className="video-wrapper"
        onWheel={handleWheel} // Controlar a velocidade de rolagem com a roda do mouse
      >
        <video
          ref={videoRef}
          className={`video-element ${isNearLimit ? 'blink-border' : ''}`}
          autoPlay
          muted
        />
        <div className="time-counter">
          <h3>Tempo de Gravação: {timeElapsed}s</h3>
        </div>

        {/* Contêiner do texto do teleprompter */}
        <div className="teleprompter-container" ref={textRef} style={{ fontSize: `${fontSize}px` }}>
          <div
            className="teleprompter-text"
            style={{ transform: `translateY(${scrollPosition}px)` }} // Aplicar a transformação para rolagem
          >
            {text.split('\n').map((line, index) => (
              <p key={index} style={{ margin: 0 }}>{line}</p>
            ))}
          </div>
        </div>

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
            <a href={videoUrl} download="video.webm">Baixar Vídeo WebM</a>
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
            min="0.1"
            max="0.9" // Ajuste do máximo de velocidade para o novo ponto central
            value={scrollSpeed}
            onChange={(e) => setScrollSpeed(parseFloat(e.target.value))}
          />
        </label>
      </div>
    </div>
  );
};

export default App;
