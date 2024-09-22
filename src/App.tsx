import React, { useState, useRef, useEffect } from 'react';
import './App.css';

const App: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false); // Controlar a rolagem tanto para teste quanto para gravação
  const [isEditing, setIsEditing] = useState(true); // Controla se está no modo de edição ou rolagem
  const [videoUrl, setVideoUrl] = useState('');
  const [text, setText] = useState('Insira seu texto aqui...');
  const [fontSize, setFontSize] = useState(20);
  const [scrollSpeed, setScrollSpeed] = useState(0.4); // Ajuste da velocidade para 0.40
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isNearLimit, setIsNearLimit] = useState(false); // Borda piscando ao se aproximar do limite de tempo
  const [scrollPosition, setScrollPosition] = useState(0); // Posição da rolagem
  const videoRef = useRef<HTMLVideoElement>(null);
  const recordedVideoRef = useRef<HTMLVideoElement>(null); // Referência para o vídeo gravado
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

    // Se estiver gravando ou testando a rolagem
    if ((isScrolling || isRecording) && !isEditing) {
      const totalScrollHeight = textRef.current?.scrollHeight ?? 0;
      const visibleHeight = textRef.current?.clientHeight ?? 0;

      setScrollPosition(0); // Resetar a rolagem

      // Adicionando atraso de 3.7 segundos tanto para gravação quanto para teste
      const delay = 3700;

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
      }, delay); // 3.7 segundos para gravação e teste de rolagem
    }

    return () => clearInterval(scrollInterval);
  }, [isScrolling, isRecording, scrollSpeed, isEditing]);

  // Função de iniciar/parar gravação com um único botão push-pull
  const toggleRecording = () => {
    // Verificar se o vídeo gravado está tocando, e pausar se necessário
    if (recordedVideoRef.current && !isRecording) {
      recordedVideoRef.current.pause(); // Pausar o vídeo gravado
    }

    if (isRecording) {
      // Parar gravação
      setIsRecording(false);
      setIsNearLimit(false); // Parar animação de bordas piscando
      setIsEditing(true); // Retornar ao modo de edição após parar a gravação
    } else {
      // Iniciar gravação
      setIsRecording(true);
      setIsEditing(false); // Sair do modo de edição quando começar a gravação
      setTimeElapsed(0); // Reiniciar o contador de gravação
    }
  };

  // Função para iniciar/parar rolagem para teste
  const toggleScrolling = () => {
    if (isScrolling) {
      setIsScrolling(false);
      setIsEditing(true); // Voltar ao modo de edição ao parar o teste de rolagem
    } else {
      setIsScrolling(true);
      setIsEditing(false); // Sair do modo de edição ao iniciar o teste de rolagem
    }
  };

  return (
    <div className="app-container">
      {/* Container para unificar os blocos de vídeo */}
      <div className="video-wrapper">
        {/* Vídeo durante a gravação */}
        <video
          ref={videoRef}
          className={`video-element ${isRecording || isScrolling ? 'highlight-video' : ''}`}
          autoPlay
          muted
          style={{
            display: isRecording || isScrolling ? 'block' : 'none', // Exibir apenas durante gravação/rolagem
            zIndex: isRecording || isScrolling ? 1 : 0, // Colocar o vídeo de gravação em destaque
          }}
        />
        
        {/* Vídeo gravado */}
        {videoUrl && (
          <video
            ref={recordedVideoRef}
            className={`video-element ${!isRecording && !isScrolling ? 'highlight-video' : ''}`}
            src={videoUrl}
            controls
            style={{
              display: !isRecording && !isScrolling ? 'block' : 'none', // Exibir apenas quando não estiver gravando
              zIndex: !isRecording && !isScrolling ? 1 : 0, // Colocar o vídeo gravado em destaque
            }}
          />
        )}

        <div className="time-counter">
          <h3>Tempo de Gravação: {timeElapsed}s</h3>
        </div>

        {/* Condicional: exibe o textarea para edição ou o texto rolando */}
        <div className="text-overlay">
          {isEditing ? (
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              style={{
                width: '100%',
                fontSize: `${fontSize}px`,
                backgroundColor: 'rgba(0, 0, 0, 0.5)', // Fundo transparente similar ao modo de rolagem
                color: '#fff', // Cor do texto para contraste
                border: 'none',
                padding: '10px',
                marginTop: '10px',
                resize: 'none',
                position: 'absolute', // Para colocar sobre a área do teleprompter
                top: '10%', // Ajuste a posição conforme necessário
                left: '5%',
                right: '5%',
                zIndex: 2
              }}
            />
          ) : (
            <div className="teleprompter-container" ref={textRef} style={{ fontSize: `${fontSize}px`, zIndex: 1 }}>
              <div
                className="teleprompter-text"
                style={{
                  transform: `translateY(${scrollPosition}px)`,
                  textAlign: 'left', // Alinhado à esquerda para facilitar a leitura
                  whiteSpace: 'normal', // Não permitir quebras de palavras no meio
                  wordWrap: 'break-word', // Permitir que palavras longas sejam quebradas corretamente
                  overflowWrap: 'break-word' // Garantir que o texto se ajuste ao layout
                }} // Aplicar a transformação para rolagem
              >
                {/* Exibe o texto completo */}
                {text.split('\n').map((line, index) => (
                  <p key={index} style={{ margin: 0 }}>{line}</p>
                ))}
              </div>
            </div>
          )}
        </div>

        {timeElapsed >= 60 && (
          <div className="time-limit-warning">
            <p>O tempo máximo de gravação de 60 segundos foi atingido!</p>
          </div>
        )}
      </div>

      <div style={{ marginTop: '20px' }}>
        {/* Botão push-pull que alterna entre Iniciar e Parar gravação */}
        <button onClick={toggleRecording}>
          {isRecording ? 'Parar Gravação' : 'Iniciar Gravação'}
        </button>

        {/* Novo botão para testar a rolagem */}
        <button onClick={toggleScrolling} style={{ marginLeft: '10px' }}>
          {isScrolling ? 'Parar Rolagem' : 'Testar Rolagem'}
        </button>

        {videoUrl && (
          <a href={videoUrl} download="video.webm">Baixar Vídeo WebM</a>
        )}
      </div>

      <div style={{ marginTop: '20px' }}>
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
