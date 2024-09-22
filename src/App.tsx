import React, { useState, useRef, useEffect } from 'react';
import './App.css'; // Importar o arquivo CSS

const App: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [text, setText] = useState('Insira seu texto aqui...');
  const [fontSize, setFontSize] = useState(20); // Diminuído para 2/3 do tamanho anterior
  const [scrollSpeed, setScrollSpeed] = useState(2.5); // Reduzido pela metade para diminuir a velocidade de rolagem
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [timeElapsed, setTimeElapsed] = useState(0); // Contador de tempo
  const [isNearLimit, setIsNearLimit] = useState(false); // Para piscar as bordas
  const [scrollPosition, setScrollPosition] = useState(0); // Controlar a posição de rolagem do texto
  const videoRef = useRef<HTMLVideoElement>(null);
  const textRef = useRef<HTMLDivElement>(null); // Referência para o texto
  const intervalRef = useRef<NodeJS.Timeout | null>(null); // Referência para o intervalo de rolagem

  useEffect(() => {
    if (isRecording && videoRef.current) {
      navigator.mediaDevices.getUserMedia({ video: { aspectRatio: 9 / 16 }, audio: true }) 
        .then(stream => {
          videoRef.current!.srcObject = stream;
          setStream(stream);

          // Usar MediaRecorder para gravar em WebM
          const options = { mimeType: 'video/webm; codecs=vp9,opus' };
          const recorder = new MediaRecorder(stream, options);
          const chunks: Blob[] = [];

          recorder.ondataavailable = (e) => {
            chunks.push(e.data);
          };

          recorder.onstop = () => {
            const completeBlob = new Blob(chunks, { type: 'video/webm' });
            const webmUrl = URL.createObjectURL(completeBlob);
            setVideoUrl(webmUrl); // Mostrar o WebM na tela
          };

          recorder.start();
          setMediaRecorder(recorder);
        })
        .catch(err => console.error('Erro ao acessar webcam e microfone:', err));
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
    let scrollInterval: NodeJS.Timeout = null!; // Controlar a rolagem

    if (textRef.current) {
      setScrollPosition(0); // Reiniciar a posição de rolagem

      if (isRecording) {
        scrollInterval = setInterval(() => {
          setScrollPosition((prev) => prev - scrollSpeed); // Ajusta a posição de rolagem
        }, 100);
      } else {
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
        <div className="teleprompter-container" style={{ fontSize: `${fontSize}px` }}>
          <div
            ref={textRef}
            className="teleprompter-text"
            style={{ transform: `translateY(${scrollPosition}px)` }} // Aplicar transformação CSS para rolar o texto
          >
            {text}
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
