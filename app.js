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

// =====================================================================
// Utilitários
// =====================================================================

const formatadorMoeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

function formatarMoeda(valor) {
    return formatadorMoeda.format(valor || 0)
}

// Converte textos como "1.234,56", "1234.56" ou "R$ 10" em número.
// Retorna NaN quando o texto não representa um valor válido.
function converterValor(texto) {
    if (typeof texto === 'number') return texto
    let limpo = String(texto ?? '').replace(/[R$\s]/g, '')
    if (limpo === '') return NaN
    if (limpo.includes(',')) {
        limpo = limpo.replace(/\./g, '').replace(',', '.')
    }
    if (!/^\d+(\.\d+)?$/.test(limpo)) return NaN
    return Math.round(parseFloat(limpo) * 100) / 100
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
    bd.recuperarTodosRegistros().forEach(d => anos.add(Number(d.ano)))
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
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Fechar"></button>
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
        const dataValida = ano > 1900 && data.getFullYear() === ano &&
            data.getMonth() === mes - 1 && data.getDate() === dia

        if (!dataValida) erros.data = 'Informe uma data válida.'
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

    gravar(despesa) {
        const lista = this.lerDespesas()
        const id = lista.reduce((max, d) => Math.max(max, d.id), 0) + 1
        lista.push({ id, ...despesa.paraRegistro() })
        this.salvarDespesas(lista)
        return id
    }

    atualizar(id, despesa) {
        const lista = this.lerDespesas()
        const i = lista.findIndex(d => d.id === Number(id))
        if (i === -1) return false
        lista[i] = { id: Number(id), ...despesa.paraRegistro() }
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
            input.value = v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
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

    bd.gravar(despesa)
    notificar(`Despesa "${despesa.descricao}" cadastrada com sucesso.`)

    // Mantém data e tipo para facilitar lançamentos em sequência
    document.getElementById('descricao').value = ''
    document.getElementById('valor').value = ''
    document.getElementById('descricao').focus()
    renderizarUltimasDespesas()
    renderizarResumoMesAtual()
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
    const total = bd.pesquisar({ ano: String(h.getFullYear()), mes: String(h.getMonth() + 1) })
        .reduce((s, d) => s + d.valor, 0)
    el.textContent = formatarMoeda(total)
    document.getElementById('nomeMesAtual').textContent = `${MESES[h.getMonth()]} de ${h.getFullYear()}`
}

function iconeCategoria(tipo) {
    const c = CATEGORIAS[tipo] ?? { icone: 'bi-question', cor: '#868e96', nome: '' }
    return `<span class="icone-categoria" style="--cor:${c.cor}" title="${c.nome}"><i class="bi ${c.icone}"></i></span>`
}

function iniciarCadastro() {
    preencherSelectCategorias(document.getElementById('tipo'), 'Selecione...')
    const data = document.getElementById('data')
    data.value = hojeIso()
    data.max = `${new Date().getFullYear() + 1}-12-31`
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
            <td class="descricao">${escaparHtml(d.descricao)}</td>
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
    document.getElementById('editValor').value =
        d.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
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

function renderizarResumo() {
    const ano = document.getElementById('resumoAno').value
    const mes = document.getElementById('resumoMes').value
    const despesas = bd.pesquisar({ ano, mes })
    const limites = bd.lerLimites()

    const porCategoria = {}
    despesas.forEach(d => { porCategoria[d.tipo] = (porCategoria[d.tipo] || 0) + d.valor })

    const totalGasto = despesas.reduce((s, d) => s + d.valor, 0)
    const totalLimite = Object.values(limites).reduce((s, v) => s + (Number(v) || 0), 0)
    const saldo = totalLimite - totalGasto

    document.getElementById('cardGasto').textContent = formatarMoeda(totalGasto)
    document.getElementById('cardQtd').textContent =
        `${despesas.length} ${despesas.length === 1 ? 'lançamento' : 'lançamentos'}`
    document.getElementById('cardOrcamento').textContent = totalLimite ? formatarMoeda(totalLimite) : '—'

    const cardSaldo = document.getElementById('cardSaldo')
    cardSaldo.textContent = totalLimite ? formatarMoeda(saldo) : '—'
    cardSaldo.classList.toggle('text-danger', totalLimite > 0 && saldo < 0)
    cardSaldo.classList.toggle('text-success', totalLimite > 0 && saldo >= 0)
    document.getElementById('cardSaldoInfo').textContent = !totalLimite
        ? 'Defina limites abaixo'
        : saldo >= 0 ? 'disponível no mês' : 'acima do orçamento'

    // Comparação com o mês anterior
    const anterior = new Date(Number(ano), Number(mes) - 2, 1)
    const totalAnterior = bd.pesquisar({ ano: String(anterior.getFullYear()), mes: String(anterior.getMonth() + 1) })
        .reduce((s, d) => s + d.valor, 0)
    const comparacao = document.getElementById('cardComparacao')
    if (totalAnterior > 0) {
        const variacao = ((totalGasto - totalAnterior) / totalAnterior) * 100
        const sobe = variacao > 0
        comparacao.innerHTML = `<i class="bi ${sobe ? 'bi-arrow-up-right' : 'bi-arrow-down-right'}"></i> ` +
            `${Math.abs(variacao).toFixed(0)}% vs. ${MESES[anterior.getMonth()].toLowerCase()}`
        comparacao.className = `small ${sobe ? 'text-danger' : 'text-success'}`
    } else {
        comparacao.textContent = 'Sem dados do mês anterior'
        comparacao.className = 'small text-body-secondary'
    }

    // Tabela por categoria
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
                        <span class="input-group-text">R$</span>
                        <input type="text" inputmode="decimal" class="form-control text-end" data-limite="${id}"
                            value="${limite ? limite.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : ''}"
                            placeholder="sem limite" aria-label="Limite mensal para ${c.nome}">
                    </div>
                </td>
            </tr>`
    }).join('')
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
    renderizarResumo()
}

// =====================================================================
// Inicialização: cada página chama a função correspondente
// =====================================================================

document.addEventListener('DOMContentLoaded', () => {
    const pagina = document.body.dataset.pagina
    if (pagina === 'cadastro') iniciarCadastro()
    if (pagina === 'consulta') iniciarConsulta()
    if (pagina === 'resumo') iniciarResumo()
})
