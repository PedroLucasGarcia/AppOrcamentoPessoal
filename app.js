'use strict'

// =====================================================================
// Constantes
// =====================================================================

// Categorias de despesa. As chaves numéricas são mantidas para
// compatibilidade com os registros salvos pelas versões anteriores.
const CATEGORIAS = {
    '1': { nome: 'Alimentação', icone: 'bi-basket', cor: '#e8590c' },
    '2': { nome: 'Educação', icone: 'bi-mortarboard', cor: '#1971c2' },
    '3': { nome: 'Lazer', icone: 'bi-controller', cor: '#9c36b5' },
    '4': { nome: 'Saúde', icone: 'bi-heart-pulse', cor: '#c92a2a' },
    '5': { nome: 'Transporte', icone: 'bi-bus-front', cor: '#2b8a3e' },
    '6': { nome: 'Moradia', icone: 'bi-house', cor: '#5f3dc4' },
    '7': { nome: 'Outros', icone: 'bi-three-dots', cor: '#495057' }
}

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

const CHAVE_DESPESAS = 'orcamento.despesas'
const CHAVE_LIMITES = 'orcamento.limites'
const CHAVE_CONFIG = 'orcamento.config'
const CHAVE_RECEITAS = 'orcamento.receitas'
const CHAVE_FIXAS = 'orcamento.fixas'

// Anos aceitos nas datas. Evita registros como "20256" digitados por engano.
const ANO_MIN = 1900
const ANO_MAX = 2100

// Moedas disponíveis. O "locale" define como o valor é escrito
// (separador de milhar, de decimais e posição do símbolo).
const MOEDAS = {
    BRL: { nome: 'Real brasileiro', locale: 'pt-BR' },
    USD: { nome: 'Dólar americano', locale: 'en-US' },
    EUR: { nome: 'Euro', locale: 'de-DE' },
    GBP: { nome: 'Libra esterlina', locale: 'en-GB' },
    JPY: { nome: 'Iene japonês', locale: 'ja-JP' },
    CAD: { nome: 'Dólar canadense', locale: 'en-CA' },
    AUD: { nome: 'Dólar australiano', locale: 'en-AU' },
    CHF: { nome: 'Franco suíço', locale: 'de-CH' },
    MXN: { nome: 'Peso mexicano', locale: 'es-MX' },
    ARS: { nome: 'Peso argentino', locale: 'es-AR' },
    CLP: { nome: 'Peso chileno', locale: 'es-CL' },
    COP: { nome: 'Peso colombiano', locale: 'es-CO' },
    PEN: { nome: 'Sol peruano', locale: 'es-PE' },
    UYU: { nome: 'Peso uruguaio', locale: 'es-UY' },
    CNY: { nome: 'Yuan chinês', locale: 'zh-CN' },
    INR: { nome: 'Rupia indiana', locale: 'en-IN' }
}

// =====================================================================
// Configurações (moeda, renda mensal e meta de economia)
// =====================================================================

function lerConfig() {
    let salvo = {}
    try { salvo = JSON.parse(localStorage.getItem(CHAVE_CONFIG)) || {} } catch { /* usa o padrão */ }
    return {
        moeda: MOEDAS[salvo.moeda] ? salvo.moeda : 'BRL',
        renda: Number(salvo.renda) > 0 ? Number(salvo.renda) : 0,
        meta: Number(salvo.meta) > 0 ? Number(salvo.meta) : 0
    }
}

let config = lerConfig()
let formatadorMoeda, formatadorNumero, casasDecimais

function prepararFormatadores() {
    const { locale } = MOEDAS[config.moeda]
    formatadorMoeda = new Intl.NumberFormat(locale, { style: 'currency', currency: config.moeda })
    casasDecimais = formatadorMoeda.resolvedOptions().maximumFractionDigits
    formatadorNumero = new Intl.NumberFormat(locale, {
        minimumFractionDigits: casasDecimais, maximumFractionDigits: casasDecimais
    })
}
prepararFormatadores()

function salvarConfig(novo) {
    config = { ...config, ...novo }
    localStorage.setItem(CHAVE_CONFIG, JSON.stringify(config))
    prepararFormatadores()
}

// =====================================================================
// Utilitários
// =====================================================================

function formatarMoeda(valor) {
    return formatadorMoeda.format(valor || 0)
}

// Número sem símbolo, para preencher campos de valor (ex.: "1.234,56")
function formatarNumero(valor) {
    return formatadorNumero.format(valor || 0)
}

function simboloMoeda() {
    return formatadorMoeda.formatToParts(0).find(p => p.type === 'currency')?.value ?? config.moeda
}

function separadorDecimal() {
    return formatadorNumero.formatToParts(1.5).find(p => p.type === 'decimal')?.value ?? ','
}

// Coloca o símbolo da moeda atual nos campos de valor da página
function atualizarSimbolosMoeda() {
    document.querySelectorAll('.simbolo-moeda').forEach(el => { el.textContent = simboloMoeda() })
    const exemplo = formatarNumero(0)
    document.querySelectorAll('[data-placeholder-valor]').forEach(el => { el.placeholder = exemplo })
}

// Converte textos como "1.234,56", "1,234.56", "1234.56" ou "R$ 10" em número.
// Aceita o jeito de escrever de qualquer país: o último separador seguido de
// 1 ou 2 dígitos é o decimal; os demais são separadores de milhar.
// Retorna NaN quando o texto não representa um valor válido.
function converterValor(texto) {
    if (typeof texto === 'number') return texto
    let t = String(texto ?? '').replace(/[\s  ']/g, '')
    if (t === '' || t.includes('-')) return NaN
    t = t.replace(/^[^\d.,]+|[^\d.,]+$/g, '') // tira símbolos como R$, US$, €
    if (!/^[\d.,]+$/.test(t) || !/\d/.test(t)) return NaN

    const iVirgula = t.lastIndexOf(','), iPonto = t.lastIndexOf('.')
    let decimal = ''
    if (iVirgula > -1 && iPonto > -1) {
        decimal = iVirgula > iPonto ? ',' : '.'
    } else if (iVirgula > -1 || iPonto > -1) {
        const sep = iVirgula > -1 ? ',' : '.'
        const partes = t.split(sep)
        const ehMilhar = partes.length > 2 || (partes[1].length === 3 && sep !== separadorDecimal())
        decimal = ehMilhar ? '' : sep
    }

    let inteiro = t, fracao = ''
    if (decimal) {
        const i = t.lastIndexOf(decimal)
        inteiro = t.slice(0, i)
        fracao = t.slice(i + 1)
    }
    inteiro = inteiro.replace(/[.,]/g, '')
    if (!/^\d*$/.test(fracao)) return NaN
    const n = parseFloat(`${inteiro || '0'}.${fracao || '0'}`)
    return isNaN(n) ? NaN : Math.round(n * 100) / 100
}

function anoValido(ano) {
    return Number.isInteger(ano) && ano >= ANO_MIN && ano <= ANO_MAX
}

function diasNoMes(ano, mes) {
    return new Date(ano, mes, 0).getDate()
}

function somar(lista) {
    return lista.reduce((s, d) => s + (Number(d.valor) || 0), 0)
}

function escaparHtml(texto) {
    return String(texto ?? '').replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]))
}

function doisDigitos(n) {
    return String(n).padStart(2, '0')
}

// Data no formato aaaa-mm-dd (usado pelo <input type="date">)
function dataIso(ano, mes, dia) {
    return `${ano}-${doisDigitos(mes)}-${doisDigitos(dia)}`
}

function hojeIso() {
    const h = new Date()
    return dataIso(h.getFullYear(), h.getMonth() + 1, h.getDate())
}

function nomeCategoria(tipo) {
    return CATEGORIAS[tipo]?.nome ?? 'Sem categoria'
}

function preencherSelectCategorias(select, rotuloVazio) {
    select.innerHTML = `<option value="">${rotuloVazio}</option>` +
        Object.entries(CATEGORIAS)
            .map(([id, c]) => `<option value="${id}">${c.nome}</option>`)
            .join('')
}

function preencherSelectMeses(select, rotuloVazio) {
    select.innerHTML = (rotuloVazio !== null ? `<option value="">${rotuloVazio}</option>` : '') +
        MESES.map((m, i) => `<option value="${i + 1}">${m}</option>`).join('')
}

function preencherSelectAnos(select, rotuloVazio) {
    const anoAtual = new Date().getFullYear()
    const anos = new Set([anoAtual])
    bd.lerDespesas().forEach(d => { if (anoValido(Number(d.ano))) anos.add(Number(d.ano)) })
    lerReceitas().forEach(r => { if (anoValido(Number(r.ano))) anos.add(Number(r.ano)) })
    select.innerHTML = (rotuloVazio !== null ? `<option value="">${rotuloVazio}</option>` : '') +
        [...anos].sort((a, b) => b - a).map(a => `<option value="${a}">${a}</option>`).join('')
}

// Exibe uma notificação rápida (toast) no canto da tela
function notificar(mensagem, tipo = 'success') {
    let area = document.getElementById('areaToasts')
    if (!area) {
        area = document.createElement('div')
        area.id = 'areaToasts'
        area.className = 'toast-container position-fixed bottom-0 end-0 p-3'
        document.body.append(area)
    }
    const el = document.createElement('div')
    el.className = `toast align-items-center text-bg-${tipo} border-0`
    el.setAttribute('role', 'status')
    el.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">${escaparHtml(mensagem)}</div>
            <button type="button" class="btn-close ${tipo === 'warning' ? '' : 'btn-close-white'} me-2 m-auto" data-bs-dismiss="toast" aria-label="Fechar"></button>
        </div>`
    area.append(el)
    el.addEventListener('hidden.bs.toast', () => el.remove())
    new bootstrap.Toast(el, { delay: 3000 }).show()
}

// =====================================================================
// Modelo
// =====================================================================

class Despesa {
    constructor(ano, mes, dia, tipo, descricao, valor) {
        this.ano = ano
        this.mes = mes
        this.dia = dia
        this.tipo = tipo
        this.descricao = typeof descricao === 'string' ? descricao.trim() : descricao
        this.valor = valor
    }

    // Cria uma despesa a partir de uma data aaaa-mm-dd
    static aPartirDeData(dataIsoTexto, tipo, descricao, valor) {
        const [ano, mes, dia] = (dataIsoTexto || '').split('-')
        return new Despesa(ano, mes && String(Number(mes)), dia && String(Number(dia)),
            tipo, descricao, valor)
    }

    // Retorna um objeto { campo: mensagem } com os erros encontrados.
    // Um objeto vazio significa que a despesa é válida.
    validar() {
        const erros = {}
        const ano = Number(this.ano), mes = Number(this.mes), dia = Number(this.dia)
        const data = new Date(ano, mes - 1, dia)
        const dataValida = anoValido(ano) && data.getFullYear() === ano &&
            data.getMonth() === mes - 1 && data.getDate() === dia

        if (!dataValida) erros.data = `Informe uma data válida (ano entre ${ANO_MIN} e ${ANO_MAX}).`
        if (!CATEGORIAS[this.tipo]) erros.tipo = 'Selecione o tipo da despesa.'
        if (!this.descricao) erros.descricao = 'Descreva a despesa.'
        else if (this.descricao.length > 100) erros.descricao = 'Use no máximo 100 caracteres.'

        const valor = converterValor(this.valor)
        if (isNaN(valor) || valor <= 0) erros.valor = 'Informe um valor maior que zero (ex.: 25,90).'

        return erros
    }

    // Mantido por compatibilidade com a versão anterior
    validarDados() {
        return Object.keys(this.validar()).length === 0
    }

    // Versão normalizada para gravação
    paraRegistro() {
        return {
            ano: String(Number(this.ano)),
            mes: String(Number(this.mes)),
            dia: String(Number(this.dia)),
            tipo: String(this.tipo),
            descricao: this.descricao,
            valor: converterValor(this.valor)
        }
    }
}

// =====================================================================
// Persistência (localStorage)
// =====================================================================

class Bd {
    constructor() {
        this.migrarFormatoAntigo()
    }

    // A versão anterior gravava cada despesa numa chave numérica
    // ("1", "2", ...) e o último id na chave "id". Aqui os registros
    // são movidos para uma única lista, sem perder dados.
    migrarFormatoAntigo() {
        const ultimoId = localStorage.getItem('id')
        if (ultimoId === null) return

        const despesas = this.lerDespesas()
        let proximoId = despesas.reduce((max, d) => Math.max(max, d.id), 0) + 1

        for (let i = 1; i <= Number(ultimoId); i++) {
            const bruto = localStorage.getItem(String(i))
            if (bruto === null) continue
            try {
                const antiga = JSON.parse(bruto)
                const valor = converterValor(antiga.valor)
                despesas.push({
                    id: proximoId++,
                    ano: String(antiga.ano),
                    mes: String(antiga.mes),
                    dia: String(antiga.dia),
                    tipo: String(antiga.tipo),
                    descricao: antiga.descricao ?? '',
                    valor: isNaN(valor) ? 0 : valor
                })
                localStorage.removeItem(String(i))
            } catch (e) {
                console.warn(`Registro antigo ${i} ignorado:`, e)
            }
        }
        this.salvarDespesas(despesas)
        localStorage.removeItem('id')
    }

    lerDespesas() {
        try {
            const lista = JSON.parse(localStorage.getItem(CHAVE_DESPESAS))
            return Array.isArray(lista) ? lista : []
        } catch {
            return []
        }
    }

    salvarDespesas(lista) {
        localStorage.setItem(CHAVE_DESPESAS, JSON.stringify(lista))
    }

    // "extra" guarda informações adicionais, como o id da despesa fixa de origem
    gravar(despesa, extra = {}) {
        const lista = this.lerDespesas()
        const id = lista.reduce((max, d) => Math.max(max, d.id), 0) + 1
        lista.push({ id, ...despesa.paraRegistro(), ...extra })
        this.salvarDespesas(lista)
        return id
    }

    atualizar(id, despesa) {
        const lista = this.lerDespesas()
        const i = lista.findIndex(d => d.id === Number(id))
        if (i === -1) return false
        lista[i] = { ...lista[i], ...despesa.paraRegistro(), id: Number(id) }
        this.salvarDespesas(lista)
        return true
    }

    remover(id) {
        this.salvarDespesas(this.lerDespesas().filter(d => d.id !== Number(id)))
    }

    buscarPorId(id) {
        return this.lerDespesas().find(d => d.id === Number(id)) ?? null
    }

    // Todas as despesas, das mais recentes para as mais antigas
    recuperarTodosRegistros() {
        return this.lerDespesas().sort((a, b) =>
            dataIso(b.ano, b.mes, b.dia).localeCompare(dataIso(a.ano, a.mes, a.dia)) || b.id - a.id)
    }

    // Filtra pelos campos preenchidos. A descrição aceita busca parcial,
    // sem diferenciar maiúsculas/minúsculas ou acentos.
    pesquisar(filtro) {
        const normalizar = t => String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
        let lista = this.recuperarTodosRegistros()

        if (filtro.ano) lista = lista.filter(d => d.ano == filtro.ano)
        if (filtro.mes) lista = lista.filter(d => d.mes == filtro.mes)
        if (filtro.dia) lista = lista.filter(d => d.dia == Number(filtro.dia))
        if (filtro.tipo) lista = lista.filter(d => d.tipo == filtro.tipo)
        if (filtro.descricao) {
            const termo = normalizar(filtro.descricao.trim())
            lista = lista.filter(d => normalizar(d.descricao).includes(termo))
        }
        if (filtro.valorMin !== '' && filtro.valorMin !== undefined) {
            const min = converterValor(filtro.valorMin)
            if (!isNaN(min)) lista = lista.filter(d => d.valor >= min)
        }
        if (filtro.valorMax !== '' && filtro.valorMax !== undefined) {
            const max = converterValor(filtro.valorMax)
            if (!isNaN(max)) lista = lista.filter(d => d.valor <= max)
        }
        return lista
    }

    // Limites de orçamento mensal por categoria: { tipo: valor }
    lerLimites() {
        try {
            return JSON.parse(localStorage.getItem(CHAVE_LIMITES)) || {}
        } catch {
            return {}
        }
    }

    salvarLimites(limites) {
        localStorage.setItem(CHAVE_LIMITES, JSON.stringify(limites))
    }
}

const bd = new Bd()

// ---------------------------------------------------------------------
// Entradas extras (receitas) e despesas fixas
// ---------------------------------------------------------------------

function lerLista(chave) {
    try {
        const lista = JSON.parse(localStorage.getItem(chave))
        return Array.isArray(lista) ? lista : []
    } catch {
        return []
    }
}

function lerReceitas() { return lerLista(CHAVE_RECEITAS) }
function salvarReceitas(lista) { localStorage.setItem(CHAVE_RECEITAS, JSON.stringify(lista)) }
function lerFixas() { return lerLista(CHAVE_FIXAS) }
function salvarFixas(lista) { localStorage.setItem(CHAVE_FIXAS, JSON.stringify(lista)) }

function receitasDoMes(ano, mes) {
    return lerReceitas().filter(r => r.ano == ano && r.mes == mes)
}

// Salário/renda fixa + entradas extras do mês
function rendaDoMes(ano, mes) {
    return config.renda + somar(receitasDoMes(ano, mes))
}

function gastoDoMes(ano, mes) {
    return somar(bd.pesquisar({ ano: String(ano), mes: String(mes) }))
}

// Cria automaticamente as despesas fixas dos meses que ainda não foram lançados
function gerarDespesasFixas() {
    const fixas = lerFixas()
    if (!fixas.length) return
    const h = new Date()
    const atual = h.getFullYear() * 12 + h.getMonth()
    let mudou = false

    fixas.forEach(f => {
        const [a, m] = String(f.ultimaGerada || '').split('-').map(Number)
        if (!a || !m) return
        let indice = a * 12 + (m - 1) + 1
        while (indice <= atual) {
            const ano = Math.floor(indice / 12), mes = (indice % 12) + 1
            const dia = Math.min(Number(f.dia) || 1, diasNoMes(ano, mes))
            bd.gravar(new Despesa(String(ano), String(mes), String(dia), f.tipo, f.descricao, f.valor), { fixaId: f.id })
            f.ultimaGerada = `${ano}-${doisDigitos(mes)}`
            mudou = true
            indice++
        }
    })
    if (mudou) salvarFixas(fixas)
}

// =====================================================================
// Formulários
// =====================================================================

// Mostra/limpa as mensagens de validação do Bootstrap num formulário.
// "campos" mapeia o nome do erro para o id do elemento.
function mostrarErros(erros, campos) {
    Object.entries(campos).forEach(([chave, idCampo]) => {
        const campo = document.getElementById(idCampo)
        const feedback = document.getElementById(`${idCampo}Erro`)
        campo.classList.toggle('is-invalid', Boolean(erros[chave]))
        if (feedback) feedback.textContent = erros[chave] || ''
    })
    const primeiro = Object.keys(campos).find(c => erros[c])
    if (primeiro) document.getElementById(campos[primeiro]).focus()
}

// Formata o campo de valor ao sair dele (ex.: "25,9" -> "25,90")
function ativarFormatacaoValor(input) {
    input.addEventListener('blur', () => {
        const v = converterValor(input.value)
        if (!isNaN(v) && v > 0) {
            input.value = formatarNumero(v)
        }
    })
}

// =====================================================================
// Página: Cadastro (index.html)
// =====================================================================

const CAMPOS_CADASTRO = { data: 'data', tipo: 'tipo', descricao: 'descricao', valor: 'valor' }

function cadastrarDespesa(evento) {
    if (evento) evento.preventDefault()

    const despesa = Despesa.aPartirDeData(
        document.getElementById('data').value,
        document.getElementById('tipo').value,
        document.getElementById('descricao').value,
        document.getElementById('valor').value
    )

    const erros = despesa.validar()
    mostrarErros(erros, CAMPOS_CADASTRO)
    if (Object.keys(erros).length) return

    const caixaFixa = document.getElementById('fixa')
    const registro = despesa.paraRegistro()
    if (caixaFixa?.checked) {
        // Despesa fixa: será lançada de novo automaticamente nos próximos meses
        const fixas = lerFixas()
        const fixaId = fixas.reduce((max, f) => Math.max(max, f.id), 0) + 1
        fixas.push({
            id: fixaId, dia: registro.dia, tipo: registro.tipo, descricao: registro.descricao,
            valor: registro.valor, ultimaGerada: `${registro.ano}-${doisDigitos(registro.mes)}`
        })
        salvarFixas(fixas)
        bd.gravar(despesa, { fixaId })
        gerarDespesasFixas()
        notificar(`Despesa fixa "${despesa.descricao}" cadastrada. Ela será repetida todo mês.`)
    } else {
        bd.gravar(despesa)
        notificar(`Despesa "${despesa.descricao}" cadastrada com sucesso.`)
    }
    avisarLimites(registro)

    // Mantém data e tipo para facilitar lançamentos em sequência
    document.getElementById('descricao').value = ''
    document.getElementById('valor').value = ''
    if (caixaFixa) caixaFixa.checked = false
    document.getElementById('descricao').focus()
    renderizarUltimasDespesas()
    renderizarResumoMesAtual()
}

// Avisa quando a despesa faz passar do limite da categoria ou da renda do mês
function avisarLimites(registro) {
    const { ano, mes, tipo } = registro
    const limite = Number(bd.lerLimites()[tipo]) || 0
    if (limite) {
        const gastoCategoria = somar(bd.pesquisar({ ano, mes, tipo }))
        if (gastoCategoria > limite) {
            notificar(`Atenção: ${nomeCategoria(tipo)} passou do limite do mês ` +
                `(${formatarMoeda(gastoCategoria)} de ${formatarMoeda(limite)}).`, 'warning')
        }
    }
    const renda = rendaDoMes(ano, mes)
    const gasto = gastoDoMes(ano, mes)
    if (renda > 0 && gasto > renda) {
        notificar(`Seus gastos de ${MESES[mes - 1].toLowerCase()} já passaram da sua renda ` +
            `em ${formatarMoeda(gasto - renda)}.`, 'danger')
    }
}

function renderizarUltimasDespesas() {
    const lista = document.getElementById('ultimasDespesas')
    if (!lista) return
    const ultimas = bd.lerDespesas().sort((a, b) => b.id - a.id).slice(0, 5)

    if (!ultimas.length) {
        lista.innerHTML = '<li class="list-group-item estado-vazio"><i class="bi bi-receipt"></i>' +
            '<div>Nenhuma despesa cadastrada ainda.</div><small>As últimas cinco aparecem aqui.</small></li>'
        return
    }
    lista.innerHTML = ultimas.map(d => `
        <li class="list-group-item d-flex align-items-center gap-3">
            ${iconeCategoria(d.tipo)}
            <div class="flex-grow-1 min-w-0">
                <div class="text-truncate">${escaparHtml(d.descricao)}</div>
                <small class="text-body-secondary">${doisDigitos(d.dia)}/${doisDigitos(d.mes)}/${d.ano} · ${nomeCategoria(d.tipo)}</small>
            </div>
            <span class="lista-item-valor">${formatarMoeda(d.valor)}</span>
        </li>`).join('')
}

function renderizarResumoMesAtual() {
    const el = document.getElementById('totalMesAtual')
    if (!el) return
    const h = new Date()
    const ano = h.getFullYear(), mes = h.getMonth() + 1
    const total = gastoDoMes(ano, mes)
    el.textContent = formatarMoeda(total)
    document.getElementById('nomeMesAtual').textContent = `${MESES[h.getMonth()]} de ${ano}`

    const caixa = document.getElementById('disponivelMesAtual')
    if (!caixa) return
    const renda = rendaDoMes(ano, mes)
    if (!renda) {
        caixa.innerHTML = `<p class="small mb-2 destaque-texto">Informe quanto você ganha para saber quanto ainda pode gastar.</p>
            <button type="button" class="btn btn-sm btn-destaque" data-abrir-config>
                <i class="bi bi-wallet2"></i> Informar minha renda
            </button>`
        return
    }
    const disponivel = renda - total
    const pct = Math.min((total / renda) * 100, 100)
    const estado = total > renda ? 'estourou' : pct >= 80 ? 'atencao' : 'ok'
    caixa.innerHTML = `
        <div class="d-flex justify-content-between align-items-baseline gap-2 mb-1">
            <span class="small destaque-texto">${disponivel >= 0 ? 'Disponível' : 'Acima da renda'}</span>
            <strong class="selo-disponivel ${estado}">${disponivel < 0 ? '−' : ''}${formatarMoeda(Math.abs(disponivel))}</strong>
        </div>
        <div class="progress progress-destaque mb-1" role="progressbar" aria-label="Parte da renda já gasta" aria-valuenow="${Math.round(pct)}" aria-valuemin="0" aria-valuemax="100">
            <div class="progress-bar ${estado}" style="width:${pct}%"></div>
        </div>
        <small class="destaque-texto">${Math.round((total / renda) * 100)}% de ${formatarMoeda(renda)} de renda</small>`
}

function iconeCategoria(tipo) {
    const c = CATEGORIAS[tipo] ?? { icone: 'bi-question', cor: '#868e96', nome: '' }
    return `<span class="icone-categoria" style="--cor:${c.cor}" title="${c.nome}"><i class="bi ${c.icone}"></i></span>`
}

function iniciarCadastro() {
    preencherSelectCategorias(document.getElementById('tipo'), 'Selecione...')
    const data = document.getElementById('data')
    data.value = hojeIso()
    data.min = `${ANO_MIN}-01-01`
    data.max = `${ANO_MAX}-12-31`
    ativarFormatacaoValor(document.getElementById('valor'))
    document.getElementById('formCadastro').addEventListener('submit', cadastrarDespesa)
    renderizarUltimasDespesas()
    renderizarResumoMesAtual()
}

// =====================================================================
// Página: Consulta (consulta.html)
// =====================================================================

let ultimoResultado = []

function lerFiltros() {
    return {
        ano: document.getElementById('ano').value,
        mes: document.getElementById('mes').value,
        dia: document.getElementById('dia').value,
        tipo: document.getElementById('tipo').value,
        descricao: document.getElementById('descricao').value,
        valorMin: document.getElementById('valorMin').value,
        valorMax: document.getElementById('valorMax').value
    }
}

function pesquisarDespesa(evento) {
    if (evento) evento.preventDefault()
    carregaListaDespesas(bd.pesquisar(lerFiltros()))
}

function limparFiltros() {
    document.getElementById('formFiltros').reset()
    carregaListaDespesas()
}

function carregaListaDespesas(despesas) {
    if (!despesas) despesas = bd.recuperarTodosRegistros()
    ultimoResultado = despesas

    const corpo = document.getElementById('listaDespesas')
    const vazio = document.getElementById('semResultados')
    const total = despesas.reduce((s, d) => s + d.valor, 0)

    document.getElementById('totalFiltrado').textContent = formatarMoeda(total)
    document.getElementById('qtdFiltrada').textContent =
        `${despesas.length} ${despesas.length === 1 ? 'despesa' : 'despesas'}`
    document.getElementById('btnExportar').disabled = despesas.length === 0

    vazio.classList.toggle('d-none', despesas.length > 0)
    vazio.innerHTML = bd.lerDespesas().length
        ? '<i class="bi bi-funnel"></i><div>Nenhuma despesa encontrada com esses filtros.</div>' +
          '<small>Ajuste ou limpe os filtros para ver mais resultados.</small>'
        : '<i class="bi bi-receipt"></i><div>Nenhuma despesa cadastrada ainda.</div>' +
          '<small><a href="index.html">Cadastre a primeira despesa</a></small>'

    corpo.innerHTML = despesas.map(d => `
        <tr>
            <td class="text-nowrap">${doisDigitos(d.dia)}/${doisDigitos(d.mes)}/${d.ano}</td>
            <td class="text-nowrap">${iconeCategoria(d.tipo)} <span class="d-none d-md-inline ms-1">${nomeCategoria(d.tipo)}</span></td>
            <td class="descricao">${escaparHtml(d.descricao)}${d.fixaId ? ' <i class="bi bi-arrow-repeat text-body-secondary" title="Despesa fixa (repete todo mês)" aria-label="Despesa fixa"></i>' : ''}</td>
            <td class="text-end valor-celula">${formatarMoeda(d.valor)}</td>
            <td class="text-end text-nowrap">
                <button type="button" class="btn btn-icone" data-acao="editar" data-id="${d.id}" title="Editar" aria-label="Editar despesa">
                    <i class="bi bi-pencil"></i>
                </button>
                <button type="button" class="btn btn-icone perigo" data-acao="excluir" data-id="${d.id}" title="Excluir" aria-label="Excluir despesa">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        </tr>`).join('')
}

// Recarrega a lista mantendo os filtros aplicados
function atualizarLista() {
    carregaListaDespesas(bd.pesquisar(lerFiltros()))
}

let idEmEdicao = null
let idParaExcluir = null
const CAMPOS_EDICAO = { data: 'editData', tipo: 'editTipo', descricao: 'editDescricao', valor: 'editValor' }

function abrirEdicao(id) {
    const d = bd.buscarPorId(id)
    if (!d) return
    idEmEdicao = d.id
    document.getElementById('editData').value = dataIso(d.ano, d.mes, d.dia)
    document.getElementById('editTipo').value = d.tipo
    document.getElementById('editDescricao').value = d.descricao
    document.getElementById('editValor').value = formatarNumero(d.valor)
    mostrarErros({}, CAMPOS_EDICAO)
    bootstrap.Modal.getOrCreateInstance('#modalEdicao').show()
}

function salvarEdicao(evento) {
    evento.preventDefault()
    const despesa = Despesa.aPartirDeData(
        document.getElementById('editData').value,
        document.getElementById('editTipo').value,
        document.getElementById('editDescricao').value,
        document.getElementById('editValor').value
    )
    const erros = despesa.validar()
    mostrarErros(erros, CAMPOS_EDICAO)
    if (Object.keys(erros).length) return

    bd.atualizar(idEmEdicao, despesa)
    bootstrap.Modal.getInstance('#modalEdicao').hide()
    notificar('Despesa atualizada.')
    atualizarLista()
}

function confirmarExclusao(id) {
    const d = bd.buscarPorId(id)
    if (!d) return
    idParaExcluir = d.id
    document.getElementById('textoExclusao').innerHTML =
        `Excluir <strong>${escaparHtml(d.descricao)}</strong> (${formatarMoeda(d.valor)}, ` +
        `${doisDigitos(d.dia)}/${doisDigitos(d.mes)}/${d.ano})? Esta ação não pode ser desfeita.`
    bootstrap.Modal.getOrCreateInstance('#modalExclusao').show()
}

function excluirConfirmado() {
    bd.remover(idParaExcluir)
    bootstrap.Modal.getInstance('#modalExclusao').hide()
    notificar('Despesa excluída.', 'secondary')
    atualizarLista()
}

// Exporta as despesas exibidas para um arquivo CSV (abre no Excel)
function exportarCsv() {
    const campo = t => `"${String(t).replace(/"/g, '""')}"`
    const linhas = [['Data', 'Tipo', 'Descrição', 'Valor'].join(';')]
    ultimoResultado.forEach(d => linhas.push([
        `${doisDigitos(d.dia)}/${doisDigitos(d.mes)}/${d.ano}`,
        campo(nomeCategoria(d.tipo)),
        campo(d.descricao),
        d.valor.toFixed(2).replace('.', ',')
    ].join(';')))

    // O BOM (﻿) faz o Excel reconhecer os acentos corretamente
    const blob = new Blob(['﻿' + linhas.join('\r\n')], { type: 'text/csv;charset=utf-8' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `despesas-${hojeIso()}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
}

function iniciarConsulta() {
    preencherSelectAnos(document.getElementById('ano'), 'Todos')
    preencherSelectMeses(document.getElementById('mes'), 'Todos')
    preencherSelectCategorias(document.getElementById('tipo'), 'Todos')
    preencherSelectCategorias(document.getElementById('editTipo'), 'Selecione...')
    ativarFormatacaoValor(document.getElementById('editValor'))
    const editData = document.getElementById('editData')
    editData.min = `${ANO_MIN}-01-01`
    editData.max = `${ANO_MAX}-12-31`

    document.getElementById('formFiltros').addEventListener('submit', pesquisarDespesa)
    document.getElementById('btnLimpar').addEventListener('click', limparFiltros)
    document.getElementById('btnExportar').addEventListener('click', exportarCsv)
    document.getElementById('formEdicao').addEventListener('submit', salvarEdicao)
    document.getElementById('btnConfirmarExclusao').addEventListener('click', excluirConfirmado)

    // Filtros de seleção aplicam a busca imediatamente
    ;['ano', 'mes', 'tipo'].forEach(id =>
        document.getElementById(id).addEventListener('change', pesquisarDespesa))

    document.getElementById('listaDespesas').addEventListener('click', e => {
        const btn = e.target.closest('button[data-acao]')
        if (!btn) return
        if (btn.dataset.acao === 'editar') abrirEdicao(btn.dataset.id)
        if (btn.dataset.acao === 'excluir') confirmarExclusao(btn.dataset.id)
    })

    carregaListaDespesas()
}

// =====================================================================
// Página: Resumo (resumo.html)
// =====================================================================

function mesAnterior(ano, mes, passos = 1) {
    const d = new Date(Number(ano), Number(mes) - 1 - passos, 1)
    return { ano: d.getFullYear(), mes: d.getMonth() + 1 }
}

function renderizarResumo() {
    const ano = Number(document.getElementById('resumoAno').value)
    const mes = Number(document.getElementById('resumoMes').value)
    const despesas = bd.pesquisar({ ano: String(ano), mes: String(mes) })
    const limites = bd.lerLimites()
    const totalGasto = somar(despesas)
    const extras = somar(receitasDoMes(ano, mes))
    const renda = config.renda + extras
    const disponivel = renda - totalGasto
    const meta = config.meta

    const h = new Date()
    const ehMesAtual = ano === h.getFullYear() && mes === h.getMonth() + 1
    const ehPassado = ano * 12 + mes < h.getFullYear() * 12 + h.getMonth() + 1

    // Renda
    document.getElementById('cardRenda').textContent = renda ? formatarMoeda(renda) : '—'
    document.getElementById('cardRendaInfo').innerHTML = !renda
        ? '<a href="#" data-abrir-config>Informar renda</a>'
        : extras
            ? `${formatarMoeda(config.renda)} fixa + ${formatarMoeda(extras)} extra`
            : 'renda mensal'

    // Gasto
    document.getElementById('cardGasto').textContent = formatarMoeda(totalGasto)
    document.getElementById('cardQtd').textContent =
        `${despesas.length} ${despesas.length === 1 ? 'lançamento' : 'lançamentos'}`

    const ant = mesAnterior(ano, mes)
    const totalAnterior = gastoDoMes(ant.ano, ant.mes)
    const comparacao = document.getElementById('cardComparacao')
    if (totalAnterior > 0) {
        const variacao = ((totalGasto - totalAnterior) / totalAnterior) * 100
        const sobe = variacao > 0
        comparacao.innerHTML = `<i class="bi ${sobe ? 'bi-arrow-up-right' : 'bi-arrow-down-right'}"></i> ` +
            `${Math.abs(variacao).toFixed(0)}% vs. ${MESES[ant.mes - 1].toLowerCase()}`
        comparacao.className = `small ${sobe ? 'text-danger' : 'text-success'}`
    } else {
        comparacao.textContent = 'Sem dados do mês anterior'
        comparacao.className = 'small text-body-secondary'
    }

    // Disponível
    const cardDisp = document.getElementById('cardDisponivel')
    const infoDisp = document.getElementById('cardDisponivelInfo')
    cardDisp.classList.remove('text-success', 'text-danger')
    if (!renda) {
        cardDisp.textContent = '—'
        infoDisp.textContent = 'informe sua renda para calcular'
    } else {
        cardDisp.textContent = formatarMoeda(disponivel)
        cardDisp.classList.add(disponivel >= 0 ? 'text-success' : 'text-danger')
        if (disponivel < 0) {
            infoDisp.textContent = 'gastos acima da renda'
        } else if (ehMesAtual) {
            const diasRestantes = diasNoMes(ano, mes) - h.getDate() + 1
            infoDisp.textContent = `≈ ${formatarMoeda(disponivel / diasRestantes)} por dia até o fim do mês`
        } else {
            infoDisp.textContent = ehPassado ? 'sobrou no mês' : 'disponível no mês'
        }
    }

    // Meta de economia
    const cardMeta = document.getElementById('cardMeta')
    const infoMeta = document.getElementById('cardMetaInfo')
    cardMeta.classList.remove('text-success', 'text-danger')
    if (!meta) {
        cardMeta.textContent = '—'
        infoMeta.innerHTML = '<a href="#" data-abrir-config>Definir meta</a>'
    } else {
        cardMeta.textContent = formatarMoeda(meta)
        if (!renda) {
            infoMeta.textContent = 'informe sua renda'
        } else if (disponivel >= meta) {
            cardMeta.classList.add('text-success')
            infoMeta.textContent = ehPassado ? 'meta alcançada' : 'meta garantida até agora'
        } else if (disponivel > 0 && !ehPassado) {
            infoMeta.textContent = `faltam ${formatarMoeda(meta - disponivel)}`
        } else {
            cardMeta.classList.add('text-danger')
            infoMeta.textContent = ehPassado ? 'meta não alcançada' : 'meta comprometida'
        }
    }

    // Barra: quanto da renda já foi gasto
    const bloco = document.getElementById('blocoRenda')
    bloco.classList.toggle('d-none', !renda)
    if (renda) {
        const pct = (totalGasto / renda) * 100
        const cor = pct > 100 ? 'bg-danger' : pct >= 80 ? 'bg-warning' : 'bg-success'
        const marca = meta && meta < renda
            ? `<span class="marca-meta" style="left:${((renda - meta) / renda) * 100}%" title="Limite para alcançar a meta"></span>`
            : ''
        bloco.innerHTML = `
            <div class="d-flex justify-content-between flex-wrap gap-2 small mb-2">
                <span><strong>${Math.round(pct)}%</strong> da renda já foi gasto</span>
                ${meta && meta < renda
                    ? `<span class="legenda-meta">Para guardar a meta, gaste até ${formatarMoeda(renda - meta)}</span>`
                    : ''}
            </div>
            <div class="barra-renda">
                <div class="progress" role="progressbar" aria-label="Parte da renda já gasta"
                    aria-valuenow="${Math.round(Math.min(pct, 100))}" aria-valuemin="0" aria-valuemax="100">
                    <div class="progress-bar ${cor}" style="width:${Math.min(pct, 100)}%"></div>
                </div>
                ${marca}
            </div>`
    }

    // Tabela por categoria
    const porCategoria = {}
    despesas.forEach(d => { porCategoria[d.tipo] = (porCategoria[d.tipo] || 0) + (Number(d.valor) || 0) })

    document.getElementById('tabelaCategorias').innerHTML = Object.entries(CATEGORIAS).map(([id, c]) => {
        const gasto = porCategoria[id] || 0
        const limite = Number(limites[id]) || 0
        const pct = limite ? (gasto / limite) * 100 : 0
        const corBarra = pct > 100 ? 'bg-danger' : pct >= 80 ? 'bg-warning' : 'bg-success'
        const participacao = totalGasto ? (gasto / totalGasto) * 100 : 0

        const barra = limite
            ? `<div class="progress" role="progressbar" aria-valuenow="${Math.round(pct)}" aria-valuemin="0" aria-valuemax="100" title="${pct.toFixed(0)}% do limite">
                   <div class="progress-bar ${corBarra}" style="width:${Math.min(pct, 100)}%"></div>
               </div>
               <small class="${pct > 100 ? 'text-danger' : 'text-body-secondary'}">${pct.toFixed(0)}% do limite</small>`
            : `<div class="progress" role="progressbar" aria-valuenow="${Math.round(participacao)}" aria-valuemin="0" aria-valuemax="100">
                   <div class="progress-bar" style="width:${participacao}%; background:${c.cor}"></div>
               </div>
               <small class="text-body-secondary">${participacao.toFixed(0)}% do total gasto</small>`

        return `
            <tr>
                <td class="text-nowrap">${iconeCategoria(id)} <span class="ms-1">${c.nome}</span></td>
                <td class="text-end text-nowrap">${formatarMoeda(gasto)}</td>
                <td class="coluna-barra">${barra}</td>
                <td>
                    <div class="input-group input-group-sm limite">
                        <span class="input-group-text">${escaparHtml(simboloMoeda())}</span>
                        <input type="text" inputmode="decimal" class="form-control text-end" data-limite="${id}"
                            value="${limite ? formatarNumero(limite) : ''}"
                            placeholder="sem limite" aria-label="Limite mensal para ${c.nome}">
                    </div>
                </td>
            </tr>`
    }).join('')

    const totalLimite = Object.values(limites).reduce((s, v) => s + (Number(v) || 0), 0)
    document.getElementById('resumoLimites').textContent = totalLimite
        ? `Soma dos limites: ${formatarMoeda(totalLimite)} por mês. Deixe em branco para não definir limite.`
        : 'Os limites valem para todos os meses. Deixe em branco para não definir limite.'

    renderizarAlertas({ renda, totalGasto, disponivel, meta, porCategoria, limites, ehPassado })
    renderizarGrafico(ano, mes)
    renderizarReceitas(ano, mes)
    renderizarFixas()
}

function renderizarAlertas({ renda, totalGasto, disponivel, meta, porCategoria, limites, ehPassado }) {
    const alertas = []
    if (renda && totalGasto > renda) {
        alertas.push(['danger', 'bi-exclamation-octagon',
            `Você gastou ${formatarMoeda(totalGasto - renda)} a mais do que ganhou neste mês.`])
    } else if (renda && meta && disponivel < meta) {
        alertas.push(['warning', 'bi-piggy-bank', ehPassado
            ? `A meta de economia não foi alcançada: sobraram ${formatarMoeda(disponivel)} de ${formatarMoeda(meta)}.`
            : `Cuidado: com os gastos atuais, faltam ${formatarMoeda(meta - disponivel)} para a meta de economia.`])
    }
    Object.entries(CATEGORIAS).forEach(([id, c]) => {
        const limite = Number(limites[id]) || 0
        const gasto = porCategoria[id] || 0
        if (limite && gasto > limite) {
            alertas.push(['warning', 'bi-exclamation-triangle',
                `${c.nome}: ${formatarMoeda(gasto - limite)} acima do limite de ${formatarMoeda(limite)}.`])
        }
    })
    document.getElementById('alertas').innerHTML = alertas.map(([tipo, icone, texto]) => `
        <div class="alert alert-${tipo} d-flex gap-2 align-items-center mb-0 py-2" role="alert">
            <i class="bi ${icone}" aria-hidden="true"></i><div>${escaparHtml(texto)}</div>
        </div>`).join('')
}

// Gráfico de barras simples: renda x gasto dos últimos 6 meses
function renderizarGrafico(ano, mes) {
    const meses = []
    for (let i = 5; i >= 0; i--) {
        const m = mesAnterior(ano, mes, i)
        meses.push({ ...m, renda: rendaDoMes(m.ano, m.mes), gasto: gastoDoMes(m.ano, m.mes), atual: i === 0 })
    }
    const temRenda = meses.some(m => m.renda > 0)
    const maximo = Math.max(1, ...meses.map(m => Math.max(m.renda, m.gasto)))
    const altura = v => `${(v / maximo) * 100}%`

    document.getElementById('grafico').innerHTML = meses.map(m => `
        <div class="grafico-mes${m.atual ? ' atual' : ''}" title="${MESES[m.mes - 1]} de ${m.ano}: gasto ${formatarMoeda(m.gasto)}${temRenda ? `, renda ${formatarMoeda(m.renda)}` : ''}">
            <div class="grafico-barras">
                ${temRenda ? `<span class="barra renda" style="height:${altura(m.renda)}"></span>` : ''}
                <span class="barra gasto${m.renda && m.gasto > m.renda ? ' estourou' : ''}" style="height:${altura(m.gasto)}"></span>
            </div>
            <div class="grafico-rotulo">${MESES[m.mes - 1].slice(0, 3)}</div>
        </div>`).join('')

    document.getElementById('graficoLegendaRenda').classList.toggle('d-none', !temRenda)
    document.getElementById('graficoDescricao').textContent = meses.map(m =>
        `${MESES[m.mes - 1]} de ${m.ano}: gasto ${formatarMoeda(m.gasto)}` +
        (temRenda ? `, renda ${formatarMoeda(m.renda)}` : '')).join('; ')
}

function renderizarReceitas(ano, mes) {
    const lista = receitasDoMes(ano, mes)
    document.getElementById('listaReceitas').innerHTML = lista.length
        ? lista.map(r => `
            <li class="list-group-item d-flex align-items-center gap-2">
                <i class="bi bi-plus-circle text-success" aria-hidden="true"></i>
                <span class="flex-grow-1 min-w-0 text-truncate">${escaparHtml(r.descricao)}</span>
                <strong class="text-success text-nowrap">${formatarMoeda(r.valor)}</strong>
                <button type="button" class="btn btn-icone perigo" data-remover-receita="${r.id}"
                    title="Remover" aria-label="Remover entrada ${escaparHtml(r.descricao)}">
                    <i class="bi bi-trash"></i>
                </button>
            </li>`).join('')
        : `<li class="list-group-item estado-vazio"><i class="bi bi-cash-coin"></i>
               <div>Nenhuma entrada extra neste mês.</div><small>Ex.: 13º, freelance, venda.</small></li>`
}

function adicionarReceita(evento) {
    evento.preventDefault()
    const campoDesc = document.getElementById('receitaDescricao')
    const campoValor = document.getElementById('receitaValor')
    const descricao = campoDesc.value.trim()
    const valor = converterValor(campoValor.value)

    campoDesc.classList.toggle('is-invalid', !descricao)
    campoValor.classList.toggle('is-invalid', isNaN(valor) || valor <= 0)
    if (!descricao || isNaN(valor) || valor <= 0) return

    const lista = lerReceitas()
    lista.push({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        ano: Number(document.getElementById('resumoAno').value),
        mes: Number(document.getElementById('resumoMes').value),
        descricao: descricao.slice(0, 100),
        valor
    })
    salvarReceitas(lista)
    evento.target.reset()
    notificar('Entrada adicionada.')
    renderizarResumo()
}

function renderizarFixas() {
    const fixas = lerFixas()
    document.getElementById('totalFixas').textContent = fixas.length
        ? `${formatarMoeda(somar(fixas))} por mês`
        : ''
    document.getElementById('listaFixas').innerHTML = fixas.length
        ? fixas.map(f => `
            <li class="list-group-item d-flex align-items-center gap-3">
                ${iconeCategoria(f.tipo)}
                <div class="flex-grow-1 min-w-0">
                    <div class="text-truncate fw-semibold">${escaparHtml(f.descricao)}</div>
                    <small class="text-body-secondary">Todo dia ${f.dia} · ${nomeCategoria(f.tipo)}</small>
                </div>
                <strong class="text-nowrap">${formatarMoeda(f.valor)}</strong>
                <button type="button" class="btn btn-icone perigo" data-parar-fixa="${f.id}"
                    title="Parar de repetir" aria-label="Parar de repetir ${escaparHtml(f.descricao)}">
                    <i class="bi bi-x-circle"></i>
                </button>
            </li>`).join('')
        : `<li class="list-group-item estado-vazio"><i class="bi bi-arrow-repeat"></i>
               <div>Nenhuma despesa fixa.</div>
               <small>Ao <a href="index.html">cadastrar uma despesa</a>, marque “Repetir todo mês”.</small></li>`
}

function iniciarResumo() {
    const h = new Date()
    const selAno = document.getElementById('resumoAno')
    const selMes = document.getElementById('resumoMes')
    preencherSelectAnos(selAno, null)
    preencherSelectMeses(selMes, null)
    selAno.value = h.getFullYear()
    selMes.value = h.getMonth() + 1

    selAno.addEventListener('change', renderizarResumo)
    selMes.addEventListener('change', renderizarResumo)
    document.getElementById('btnSalvarLimites').addEventListener('click', salvarLimites)
    document.getElementById('formReceita').addEventListener('submit', adicionarReceita)
    ativarFormatacaoValor(document.getElementById('receitaValor'))

    document.getElementById('listaReceitas').addEventListener('click', e => {
        const btn = e.target.closest('[data-remover-receita]')
        if (!btn) return
        salvarReceitas(lerReceitas().filter(r => r.id !== btn.dataset.removerReceita))
        notificar('Entrada removida.', 'secondary')
        renderizarResumo()
    })

    document.getElementById('listaFixas').addEventListener('click', e => {
        const btn = e.target.closest('[data-parar-fixa]')
        if (!btn) return
        const fixa = lerFixas().find(f => f.id === btn.dataset.pararFixa)
        if (!fixa) return
        if (!confirm(`Parar de repetir "${fixa.descricao}"? Os lançamentos já feitos continuam salvos.`)) return
        salvarFixas(lerFixas().filter(f => f.id !== fixa.id))
        notificar('Despesa fixa encerrada.', 'secondary')
        renderizarFixas()
    })

    renderizarResumo()
}

function salvarLimites() {
    const limites = {}
    let invalido = false
    document.querySelectorAll('[data-limite]').forEach(input => {
        input.classList.remove('is-invalid')
        if (input.value.trim() === '') return
        const v = converterValor(input.value)
        if (isNaN(v) || v < 0) {
            input.classList.add('is-invalid')
            invalido = true
        } else if (v > 0) {
            limites[input.dataset.limite] = v
        }
    })
    if (invalido) {
        notificar('Corrija os limites destacados em vermelho.', 'danger')
        return
    }
    bd.salvarLimites(limites)
    notificar('Limites de orçamento salvos.')
    renderizarResumo()
}

// =====================================================================
// Configurações: moeda, renda, meta e backup (todas as páginas)
// =====================================================================

function rerenderPagina() {
    const pagina = document.body.dataset.pagina
    if (pagina === 'cadastro') { renderizarUltimasDespesas(); renderizarResumoMesAtual() }
    if (pagina === 'consulta') atualizarLista()
    if (pagina === 'resumo') renderizarResumo()
}

function opcoesMoeda() {
    return Object.entries(MOEDAS).map(([codigo, m]) => {
        const simbolo = new Intl.NumberFormat(m.locale, { style: 'currency', currency: codigo })
            .formatToParts(0).find(p => p.type === 'currency')?.value ?? codigo
        return `<option value="${codigo}">${codigo} · ${m.nome} (${simbolo})</option>`
    }).join('')
}

function iniciarConfig() {
    document.body.insertAdjacentHTML('beforeend', `
        <div class="modal fade" id="modalConfig" tabindex="-1" aria-labelledby="tituloConfig" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
                <form class="modal-content" id="formConfig" novalidate>
                    <div class="modal-header">
                        <h2 class="modal-title fs-5" id="tituloConfig"><i class="bi bi-gear"></i> Configurações</h2>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-3">
                            <label for="cfgMoeda" class="form-label">Moeda</label>
                            <select class="form-select" id="cfgMoeda">${opcoesMoeda()}</select>
                            <div class="form-text">Muda só o símbolo e o formato. Os valores já lançados não são convertidos.</div>
                        </div>
                        <div class="mb-3">
                            <label for="cfgRenda" class="form-label">Quanto você ganha por mês</label>
                            <div class="input-group has-validation">
                                <span class="input-group-text simbolo-moeda"></span>
                                <input type="text" inputmode="decimal" class="form-control text-end" id="cfgRenda" data-placeholder-valor autocomplete="off">
                                <div class="invalid-feedback">Informe um valor válido.</div>
                            </div>
                            <div class="form-text">Salário ou renda fixa. Entradas extras você lança no Resumo.</div>
                        </div>
                        <div class="mb-3">
                            <label for="cfgMeta" class="form-label">Meta de economia por mês</label>
                            <div class="input-group has-validation">
                                <span class="input-group-text simbolo-moeda"></span>
                                <input type="text" inputmode="decimal" class="form-control text-end" id="cfgMeta" data-placeholder-valor autocomplete="off">
                                <div class="invalid-feedback">A meta precisa ser um valor válido e menor que a renda.</div>
                            </div>
                            <div class="form-text">Quanto você quer guardar todo mês. Deixe em branco se não tiver meta.</div>
                        </div>
                        <hr>
                        <div class="form-label">Seus dados</div>
                        <p class="small text-body-secondary mb-2">Os dados ficam só neste navegador. Faça uma cópia para não perder nada ou para levar para outro aparelho.</p>
                        <div class="d-flex flex-wrap gap-2">
                            <button type="button" class="btn btn-sm btn-outline-secondary" id="btnBackup"><i class="bi bi-download"></i> Baixar cópia</button>
                            <button type="button" class="btn btn-sm btn-outline-secondary" id="btnRestaurar"><i class="bi bi-upload"></i> Restaurar cópia</button>
                            <input type="file" id="arquivoBackup" accept="application/json,.json" hidden>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancelar</button>
                        <button type="submit" class="btn btn-primary">Salvar</button>
                    </div>
                </form>
            </div>
        </div>`)

    const moeda = document.getElementById('cfgMoeda')
    const renda = document.getElementById('cfgRenda')
    const meta = document.getElementById('cfgMeta')
    ativarFormatacaoValor(renda)
    ativarFormatacaoValor(meta)

    document.addEventListener('click', e => {
        const gatilho = e.target.closest('[data-abrir-config]')
        if (!gatilho) return
        e.preventDefault()
        moeda.value = config.moeda
        renda.value = config.renda ? formatarNumero(config.renda) : ''
        meta.value = config.meta ? formatarNumero(config.meta) : ''
        renda.classList.remove('is-invalid')
        meta.classList.remove('is-invalid')
        bootstrap.Modal.getOrCreateInstance('#modalConfig').show()
    })

    document.getElementById('formConfig').addEventListener('submit', e => {
        e.preventDefault()
        const valorRenda = renda.value.trim() === '' ? 0 : converterValor(renda.value)
        const valorMeta = meta.value.trim() === '' ? 0 : converterValor(meta.value)
        const rendaRuim = isNaN(valorRenda) || valorRenda < 0
        const metaRuim = isNaN(valorMeta) || valorMeta < 0 || (valorRenda > 0 && valorMeta >= valorRenda)
        renda.classList.toggle('is-invalid', rendaRuim)
        meta.classList.toggle('is-invalid', metaRuim)
        if (rendaRuim || metaRuim) return

        salvarConfig({ moeda: moeda.value, renda: valorRenda, meta: valorMeta })
        atualizarSimbolosMoeda()
        bootstrap.Modal.getInstance('#modalConfig').hide()
        notificar('Configurações salvas.')
        rerenderPagina()
    })

    document.getElementById('btnBackup').addEventListener('click', () => {
        const dados = {
            app: 'orcamento-pessoal', versao: 1, exportadoEm: new Date().toISOString(),
            despesas: bd.lerDespesas(), receitas: lerReceitas(), fixas: lerFixas(),
            limites: bd.lerLimites(), config
        }
        const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' })
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.download = `orcamento-backup-${hojeIso()}.json`
        link.click()
        URL.revokeObjectURL(link.href)
    })

    const arquivo = document.getElementById('arquivoBackup')
    document.getElementById('btnRestaurar').addEventListener('click', () => arquivo.click())
    arquivo.addEventListener('change', async () => {
        const f = arquivo.files[0]
        arquivo.value = ''
        if (!f) return
        let dados
        try { dados = JSON.parse(await f.text()) } catch { dados = null }
        if (!dados || dados.app !== 'orcamento-pessoal' || !Array.isArray(dados.despesas)) {
            notificar('Arquivo de backup inválido.', 'danger')
            return
        }
        if (!confirm(`Restaurar a cópia com ${dados.despesas.length} despesas? Os dados atuais deste navegador serão substituídos.`)) return
        localStorage.setItem(CHAVE_DESPESAS, JSON.stringify(dados.despesas))
        localStorage.setItem(CHAVE_RECEITAS, JSON.stringify(Array.isArray(dados.receitas) ? dados.receitas : []))
        localStorage.setItem(CHAVE_FIXAS, JSON.stringify(Array.isArray(dados.fixas) ? dados.fixas : []))
        localStorage.setItem(CHAVE_LIMITES, JSON.stringify(dados.limites && typeof dados.limites === 'object' ? dados.limites : {}))
        localStorage.setItem(CHAVE_CONFIG, JSON.stringify(dados.config && typeof dados.config === 'object' ? dados.config : {}))
        location.reload()
    })
}

// =====================================================================
// Tema claro / escuro
// =====================================================================

function atualizarBotaoTema() {
    const botao = document.getElementById('btnTema')
    if (!botao) return
    const escuro = document.documentElement.getAttribute('data-bs-theme') === 'dark'
    const texto = escuro ? 'Mudar para o tema claro' : 'Mudar para o tema escuro'
    botao.querySelector('i').className = escuro ? 'bi bi-sun' : 'bi bi-moon-stars'
    botao.setAttribute('aria-label', texto)
    botao.title = texto
}

function iniciarTema() {
    const botao = document.getElementById('btnTema')
    if (!botao) return
    atualizarBotaoTema()
    botao.addEventListener('click', () => {
        const novo = document.documentElement.getAttribute('data-bs-theme') === 'dark' ? 'light' : 'dark'
        document.documentElement.setAttribute('data-bs-theme', novo)
        try { localStorage.setItem('orcamento.tema', novo) } catch (e) { /* sem armazenamento */ }
        botao.classList.remove('girando')
        void botao.offsetWidth
        botao.classList.add('girando')
        atualizarBotaoTema()
    })
    // Se o tema do sistema mudar e não houver escolha salva, o ícone acompanha
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', atualizarBotaoTema)
}

document.addEventListener('DOMContentLoaded', () => {
    const pagina = document.body.dataset.pagina
    gerarDespesasFixas()
    iniciarTema()
    iniciarConfig()
    atualizarSimbolosMoeda()
    if (pagina === 'cadastro') iniciarCadastro()
    if (pagina === 'consulta') iniciarConsulta()
    if (pagina === 'resumo') iniciarResumo()
})
