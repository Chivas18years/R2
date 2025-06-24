"use client";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";

function ResumoContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Extrair dados dos parâmetros da URL
  const dados = {
    nome: searchParams.get('nome') || '',
    cpf: searchParams.get('cpf') || '',
    email: searchParams.get('email') || '',
    telefone: searchParams.get('telefone') || '',
    endereco: searchParams.get('endereco') || '',
    numero: searchParams.get('numero') || '',
    bairro: searchParams.get('bairro') || '',
    cidade: searchParams.get('cidade') || '',
    uf: searchParams.get('uf') || '',
    servico: searchParams.get('servico') || 'RG - Primeira via',
    valor: searchParams.get('valor') || '43,31'
  };

  const handleConfirmar = () => {
    // Redirecionar para a página de pagamento com os dados
    const params = new URLSearchParams(searchParams);
    router.push(`/pagamento?${params.toString()}`);
  };

  const handleEditar = () => {
    // Voltar para o formulário
    router.back();
  };

  return (
    <section className="py-12 min-h-[90vh] bg-[#f7fbfb] flex items-center justify-center">
      <div className="w-full max-w-4xl bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-[#0550ae] text-white p-6">
          <h1 className="text-2xl md:text-3xl font-bold text-center">Resumo do pedido:</h1>
        </div>

        <div className="p-8">
          {/* Aviso importante */}
          <div className="bg-yellow-50 border border-yellow-200 rounded p-4 mb-8">
            <p className="text-sm text-[#919db1]">
              <strong>Importante:</strong> A seleção da data para o agendamento só será liberada após a confirmação do pagamento da 
              guia oficial. Você receberá as instruções por email.
            </p>
          </div>

          {/* Dados do usuário */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-[#0550ae] mb-6">Confira seus dados:</h2>
            <div className="bg-[#f7fbfb] rounded-lg p-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <span className="font-medium text-[#092046]">CPF:</span>
                  <span className="ml-2 text-[#919db1]">{dados.cpf}</span>
                </div>
                <div>
                  <span className="font-medium text-[#092046]">Nome:</span>
                  <span className="ml-2 text-[#919db1]">{dados.nome}</span>
                </div>
                <div>
                  <span className="font-medium text-[#092046]">Email:</span>
                  <span className="ml-2 text-[#919db1]">{dados.email}</span>
                </div>
                <div>
                  <span className="font-medium text-[#092046]">Telefone:</span>
                  <span className="ml-2 text-[#919db1]">{dados.telefone}</span>
                </div>
                <div className="md:col-span-2">
                  <span className="font-medium text-[#092046]">Endereço:</span>
                  <span className="ml-2 text-[#919db1]">
                    {dados.endereco}, {dados.numero}, {dados.bairro}, {dados.cidade}, {dados.uf}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Informações do serviço */}
          <div className="mb-8">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <span className="font-bold text-[#092046]">Serviço:</span>
                <div className="text-right">
                  <span className="text-[#919db1]">{dados.servico}</span>
                </div>
              </div>
              <div>
                <span className="font-bold text-[#092046]">Valor:</span>
                <div className="text-right">
                  <span className="text-[#919db1]">R$ {dados.valor}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Aviso sobre PIX */}
          <div className="bg-yellow-50 border border-yellow-200 rounded p-4 mb-8">
            <p className="text-sm text-[#919db1]">
              <strong>Importante:</strong> O pagamento deve ser feito exclusivamente via PIX.
            </p>
          </div>

          {/* Botões de ação */}
          <div className="flex flex-col md:flex-row gap-4">
            <button
              onClick={handleConfirmar}
              className="flex-1 bg-[#28a745] hover:bg-[#218838] text-white font-semibold py-3 px-6 rounded shadow transition"
            >
              Emitir Guia de Pagamento
            </button>
            <button
              onClick={handleEditar}
              className="flex-1 bg-[#6c757d] hover:bg-[#5a6268] text-white font-semibold py-3 px-6 rounded shadow transition"
            >
              Voltar
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Resumo() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <ResumoContent />
    </Suspense>
  );
}

