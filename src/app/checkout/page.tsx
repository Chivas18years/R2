"use client";
import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation"; // Importar useRouter
import { submitCheckoutForm } from "./actions"; // Importar a Server Action

const masks = {
  cpf: (v: string) => v.replace(/\D/g,"").replace(/(\d{3})(\d)/,"$1.$2").replace(/(\d{3})(\d)/,"$1.$2").replace(/(\d{3})(\d{1,2})$/,"$1-$2").slice(0,14),
  tel: (v: string) => v.replace(/\D/g,"").replace(/(\d{2})(\d)/,"($1) $2").replace(/(\d{5})(\d{1,4})$/,"$1-$2").slice(0, 15),
  cep: (v: string) => v.replace(/\D/g,"").replace(/(\d{5})(\d{1,3})$/, "$1-$2").slice(0, 9),
};

export default function Checkout() {
  const router = useRouter(); // Hook para navegação
  const [form, setForm] = useState({
    nome: "",
    cpf: "",
    nascimento: "",
    email: "",
    telefone: "",
    tipo: "",
    categoria: "",
    endereco: "",
    numero: "",
    bairro: "",
    cep: "",
    uf: "",
    cidade: "",
  });
  const [enviado, setEnviado] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cepLoading, setCepLoading] = useState(false);

  async function buscarCEP(cep: string) {
    if (cep.length === 9) { // CEP com máscara: 12345-678
      setCepLoading(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cep.replace('-', '')}/json/`);
        const data = await response.json();
        
        if (!data.erro) {
          setForm(f => ({
            ...f,
            endereco: data.logradouro,
            bairro: data.bairro,
            cidade: data.localidade,
            uf: data.uf
          }));
          // Focar no campo número após preenchimento automático
          setTimeout(() => {
            const numeroField = document.querySelector('input[name="numero"]') as HTMLInputElement;
            if (numeroField) numeroField.focus();
          }, 100);
        }
      } catch (error) {
        console.error('Erro ao buscar CEP:', error);
      } finally {
        setCepLoading(false);
      }
    }
  }

  function handleChange(e: any) {
    const { name, value } = e.target;
    let v = value;
    if (name === "cpf") v = masks.cpf(v);
    if (name === "telefone") v = masks.tel(v);
    if (name === "cep") {
      v = masks.cep(v);
      buscarCEP(v); // Buscar CEP automaticamente
    }
    setForm(f => ({ ...f, [name]: v }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    // CORRIGIDO AQUI: Remover 'undefined' da chamada submitCheckoutForm
    const result = await submitCheckoutForm(formData); 

    setLoading(false);
    if (result.success) {
      setEnviado(true);
      // Preparar dados para a página de resumo
      const resumoParams = new URLSearchParams({
        nome: form.nome,
        cpf: form.cpf,
        email: form.email,
        telefone: form.telefone,
        endereco: form.endereco,
        numero: form.numero,
        bairro: form.bairro,
        cidade: form.cidade,
        uf: form.uf,
        servico: form.tipo,
        valor: '43,31' // Valor padrão, pode ser dinâmico
      });
      
      setTimeout(() => {
        router.push(`/resumo?${resumoParams.toString()}`);
      }, 2000);
    } else {
      setError(result.error || "Ocorreu um erro desconhecido.");
    }
  }

  if (enviado) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center">
        <Image src="https://ext.same-assets.com/2670431573/627147471.svg" width={60} height={60} alt="sucesso" className="mb-4" />
        <h2 className="text-2xl font-bold text-[#092046] mb-2">Dados enviados com sucesso!</h2>
        <p className="text-[#919db1] mb-4">Aguarde enquanto preparamos a tela de pagamento PIX…</p>
        <div className="animate-pulse h-3 w-3 bg-[#0550ae] rounded-full" />
      </div>
    );
  }

  return (
    <section className="py-12 min-h-[90vh] bg-[#f7fbfb] flex items-center justify-center">
      <div className="w-full max-w-xl bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-2xl md:text-3xl font-bold text-[#092046] mb-6 text-center">Preencha os dados para iniciar o agendamento</h1>
        {error && <p className="text-red-500 text-center mb-4">{error}</p>}
        <form className="grid gap-5" onSubmit={handleSubmit} autoComplete="off">
          <div>
            <label className="font-medium text-[#092046]">Nome completo *</label>
            <input type="text" name="nome" required value={form.nome} onChange={handleChange} className="mt-1 w-full rounded border px-3 py-2 text-[#092046] focus:ring focus:outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-medium text-[#092046]">CPF *</label>
              <input type="text" name="cpf" required value={form.cpf} onChange={handleChange} maxLength={14} className="mt-1 w-full rounded border px-3 py-2 text-[#092046] focus:ring focus:outline-none" />
            </div>
            <div>
              <label className="font-medium text-[#092046]">Data de nascimento *</label>
              <input type="date" name="nascimento" required value={form.nascimento} onChange={handleChange} className="mt-1 w-full rounded border px-3 py-2 text-[#092046] focus:ring focus:outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-medium text-[#092046]">E-mail *</label>
              <input type="email" name="email" required value={form.email} onChange={handleChange} className="mt-1 w-full rounded border px-3 py-2 text-[#092046] focus:ring focus:outline-none" />
            </div>
            <div>
              <label className="font-medium text-[#092046]">Telefone *</label>
              <input type="text" name="telefone" required value={form.telefone} maxLength={15} onChange={handleChange} className="mt-1 w-full rounded border px-3 py-2 text-[#092046] focus:ring focus:outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-medium text-[#092046]">Tipo de CNH *</label>
              <select name="tipo" required value={form.tipo} onChange={handleChange} className="mt-1 w-full rounded border px-3 py-2 bg-white text-[#092046]">
                <option value="">Selecione</option>
                <option value="Primeira Habilitação">Primeira Habilitação</option>
                <option value="Renovação">Renovação</option>
                <option value="Adição de Categoria">Adição de Categoria</option>
                <option value="Segunda Via">Segunda Via</option>
              </select>
            </div>
            <div>
              <label className="font-medium text-[#092046]">Categoria desejada *</label>
              <select name="categoria" required value={form.categoria} onChange={handleChange} className="mt-1 w-full rounded border px-3 py-2 bg-white text-[#092046]">
                <option value="">Selecione</option>
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="AB">AB</option>
                <option value="C">C</option>
                <option value="D">D</option>
                <option value="E">E</option>
              </select>
            </div>
          </div>
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-bold text-blue-800">Digite o seu endereço:</h3>
                <p className="text-sm text-blue-700 mt-1">
                  <strong>Importante:</strong> A seleção da data para o agendamento só será liberada após a confirmação do pagamento da guia oficial. Você receberá as instruções por email.
                </p>
              </div>
            </div>
          </div>
          
          <div>
            <label className="font-medium text-[#092046]">CEP *</label>
            <input 
              type="text" 
              name="cep" 
              required 
              value={form.cep} 
              onChange={handleChange} 
              maxLength={9} 
              className="mt-1 w-full rounded border px-3 py-2 text-[#092046] focus:ring focus:outline-none" 
              placeholder="00000-000"
            />
            {cepLoading && <p className="text-sm text-blue-600 mt-1">Buscando endereço...</p>}
          </div>
          
          <div>
            <label className="font-medium text-[#092046]">Rua *</label>
            <input 
              type="text" 
              name="endereco" 
              required 
              value={form.endereco} 
              onChange={handleChange} 
              className="mt-1 w-full rounded border px-3 py-2 text-[#092046] focus:ring focus:outline-none" 
            />
          </div>
          
          <div>
            <label className="font-medium text-[#092046]">Número *</label>
            <input 
              type="text" 
              name="numero" 
              required 
              value={form.numero} 
              onChange={handleChange} 
              className="mt-1 w-full rounded border px-3 py-2 text-[#092046] focus:ring focus:outline-none" 
            />
          </div>
          
          <div>
            <label className="font-medium text-[#092046]">Bairro *</label>
            <input 
              type="text" 
              name="bairro" 
              required 
              value={form.bairro} 
              onChange={handleChange} 
              className="mt-1 w-full rounded border px-3 py-2 text-[#092046] focus:ring focus:outline-none" 
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-medium text-[#092046]">Cidade *</label>
              <input 
                type="text" 
                name="cidade" 
                required 
                value={form.cidade} 
                onChange={handleChange} 
                className="mt-1 w-full rounded border px-3 py-2 text-[#092046] focus:ring focus:outline-none" 
              />
            </div>
            <div>
              <label className="font-medium text-[#092046]">Estado *</label>
              <input 
                type="text" 
                name="uf" 
                required 
                value={form.uf} 
                onChange={handleChange} 
                maxLength={2} 
                className="mt-1 w-full rounded border px-3 py-2 text-[#092046] uppercase focus:ring focus:outline-none" 
              />
            </div>
          </div>
          
          <div className="bg-amber-50 border-l-4 border-amber-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-bold text-amber-800">
                  Atenção: Confira se os dados foram preenchidos corretamente antes de passar para a próxima etapa.
                </p>
              </div>
            </div>
          </div>
          <button disabled={loading} type="submit" className="mt-6 w-full bg-[#0550ae] hover:bg-[#092046] text-white font-bold py-4 px-6 rounded-lg shadow-lg transition disabled:opacity-60 disabled:cursor-not-allowed transform hover:scale-105">
            {loading ? (
              <div className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Enviando...
              </div>
            ) : (
              "Próximo"
            )}
          </button>
        </form>
      </div>
    </section>
  );
}