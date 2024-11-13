// Classe que representa uma Despesa com atributos de data, tipo, descrição e valor.
class Despesa {
    constructor(ano, mes, dia, tipo, descricao, valor) {
        // Define o ano da despesa
        this.ano = ano
        // Define o mês da despesa
        this.mes = mes
        // Define o dia da despesa
        this.dia = dia
        // Define o tipo de despesa (por exemplo, alimentação, transporte, etc.)
        this.tipo = tipo
        // Define a descrição detalhada da despesa
        this.descricao = descricao
        // Define o valor monetário da despesa
        this.valor = valor
    }

    // Método para validar se todos os dados da despesa foram preenchidos corretamente
    validarDados() {
        for (let i in this) {
            // Se qualquer campo for indefinido, vazio ou nulo, retorna falso
            if (this[i] == undefined || this[i] == '' || this[i] == null) {
                return false
            }
        }
        // Todos os campos estão preenchidos, retorna verdadeiro
        return true
    }
}

// Classe para manipulação das despesas no localStorage
class Bd {
    constructor() {
        // Verifica se já existe um ID de controle no localStorage
        let id = localStorage.getItem('id')

        // Caso não exista, inicializa o ID com 0
        if (id === null) {
            localStorage.setItem('id', 0)
        }
    }

    // Método para obter o próximo ID disponível no localStorage
    getProximoId() {
        let proximoId = localStorage.getItem('id') // Recupera o último ID
        return parseInt(proximoId) + 1  // Incrementa o último ID em 1
    }

    // Método para gravar uma nova despesa no localStorage
    gravar(d) {
        let id = this.getProximoId()  // Obtém o próximo ID disponível
        localStorage.setItem(id, JSON.stringify(d)) // Salva a despesa convertida para JSON
        localStorage.setItem('id', id) // Atualiza o ID atual no localStorage
    }

    // Recupera todas as despesas registradas no localStorage
    recuperarTodosRegistros() {
        let despesas = Array()  // Array para armazenar todas as despesas
        let id = localStorage.getItem('id') // Obtém o último ID armazenado

        // Itera até o ID atual para recuperar todas as despesas
        for (let i = 1; i <= id; i++) {
            let despesa = JSON.parse(localStorage.getItem(i)) // Converte de JSON para objeto

            // Verifica se o registro existe; se não, continua para o próximo
            if (despesa === null) {
                continue
            }
            despesa.id = i // Adiciona o ID ao objeto despesa
            despesas.push(despesa) // Adiciona a despesa ao array
        }
        return despesas // Retorna o array com todas as despesas recuperadas
    }

    // Pesquisa despesas com base nos critérios informados
    pesquisar(despesa) {
        let despesasFiltradas = this.recuperarTodosRegistros()

        // Filtra por ano, se preenchido
        if (despesa.ano !== '') {
            despesasFiltradas = despesasFiltradas.filter(d => d.ano == despesa.ano)
        }
        // Filtra por mês, se preenchido
        if (despesa.mes !== '') {
            despesasFiltradas = despesasFiltradas.filter(d => d.mes == despesa.mes)
        }
        // Filtra por dia, se preenchido
        if (despesa.dia !== '') {
            despesasFiltradas = despesasFiltradas.filter(d => d.dia == despesa.dia)
        }
        // Filtra por tipo, se preenchido
        if (despesa.tipo !== '') {
            despesasFiltradas = despesasFiltradas.filter(d => d.tipo == despesa.tipo)
        }
        // Filtra por descrição, se preenchido
        if (despesa.descricao !== '') {
            despesasFiltradas = despesasFiltradas.filter(d => d.descricao == despesa.descricao)
        }
        // Filtra por valor, se preenchido
        if (despesa.valor !== '') {
            despesasFiltradas = despesasFiltradas.filter(d => d.valor == despesa.valor)
        }
        return despesasFiltradas
    }

    // Remove uma despesa do localStorage pelo ID
    remover(id) {
        localStorage.removeItem(id)
    }
}

// Instancia a classe Bd para gerenciar as despesas
let bd = new Bd()

// Função que captura os dados do formulário e cadastra uma nova despesa
function cadastrarDespesa() {
    // Captura os valores dos campos do formulário
    let ano = document.getElementById('ano')
    let mes = document.getElementById('mes')
    let dia = document.getElementById('dia')
    let tipo = document.getElementById('tipo')
    let descricao = document.getElementById('descricao')
    let valor = document.getElementById('valor')

    // Cria uma nova instância de Despesa com os dados do formulário
    let despesa = new Despesa(ano.value, mes.value, dia.value, tipo.value, descricao.value, valor.value)

    // Valida os dados da despesa antes de gravá-la
    if (despesa.validarDados()) {
        bd.gravar(despesa)  // Grava a despesa no localStorage

        // Exibe mensagem de sucesso
        document.getElementById('modalTitulo').innerHTML = 'Registro inserido com sucesso'
        document.getElementById('modalTituloDiv').className = 'modal-header text-success'
        document.getElementById('modalConteudo').innerHTML = 'A despesa foi cadastrada com sucesso'
        document.getElementById('modalBtn').innerHTML = 'Voltar'
        document.getElementById('modalBtn').className = 'btn btn-success'
        $('#modalRegistroDespesa').modal('show')

        // Limpa os campos do formulário após o registro
        ano.value = ''
        mes.value = ''
        dia.value = ''
        tipo.value = ''
        descricao.value = ''
        valor.value = ''
    } else {
        // Exibe mensagem de erro caso algum dado esteja ausente
        document.getElementById('modalTitulo').innerHTML = 'Erro na inclusão do registro'
        document.getElementById('modalTituloDiv').className = 'modal-header text-danger'
        document.getElementById('modalConteudo').innerHTML = 'Preencha todos os campos para que a despesa seja cadastrada'
        document.getElementById('modalBtn').innerHTML = 'Voltar e corrigir'
        document.getElementById('modalBtn').className = 'btn btn-danger'
        $('#modalRegistroDespesa').modal('show')
    }
}

// Função para carregar a lista de despesas, exibindo-as em uma tabela
function carregaListaDespesas(despesas = Array(), filtro = false) {
    if (despesas.length == 0 && filtro == false) {
        despesas = bd.recuperarTodosRegistros()
    }

    let listaDespesas = document.getElementById('listaDespesas')
    listaDespesas.innerHTML = '' // Limpa a lista antes de preenchê-la

    despesas.forEach(function(d) {
        let linha = listaDespesas.insertRow() // Cria uma nova linha na tabela

        // Preenche as células da linha com os dados da despesa
        linha.insertCell(0).innerHTML = `${d.dia}/${d.mes}/${d.ano}`
        
        // Ajusta o valor do tipo de despesa com base na sua categoria
        switch (d.tipo) {
            case '1': d.tipo = 'Alimentação'; break
            case '2': d.tipo = 'Educação'; break
            case '3': d.tipo = 'Lazer'; break
            case '4': d.tipo = 'Saúde'; break
            case '5': d.tipo = 'Transporte'; break
        }
        linha.insertCell(1).innerHTML = d.tipo
        linha.insertCell(2).innerHTML = d.descricao
        linha.insertCell(3).innerHTML = d.valor

        // Botão para excluir a despesa
        let btn = document.createElement("button")
        btn.className = 'btn btn-danger'
        btn.innerHTML = '<i class="fas fa-times"></i>'
        btn.id = `id_despesa_${d.id}`
        btn.onclick = function() {
            let id = this.id.replace('id_despesa_', '')
            bd.remover(id)
            window.location.reload() // Atualiza a página após exclusão
        }
        linha.insertCell(4).append(btn)
    })
}

// Função para pesquisar uma despesa com base nos critérios informados
function pesquisarDespesa() {
    let ano = document.getElementById('ano').value
    let mes = document.getElementById('mes').value
    let dia = document.getElementById('dia').value
    let tipo = document.getElementById('tipo').value
    let descricao = document.getElementById('descricao').value
    let valor = document.getElementById('valor').value

    // Cria um objeto despesa com os dados de busca
    let despesa = new Despesa(ano, mes, dia, tipo, descricao, valor)
    let despesas = bd.pesquisar(despesa) // Pesquisa despesas correspondentes
    carregaListaDespesas(despesas, true) // Carrega a lista de despesas filtradas
}