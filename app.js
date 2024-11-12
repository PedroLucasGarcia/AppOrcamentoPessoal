// Classe que representa uma Despesa com atributos de data, tipo, descrição e valor.
class Despesa {
    constructor(ano, mes, dia, tipo, descricao, valor) {
        // Inicializa o ano da despesa
        this.ano = ano
        // Inicializa o mês da despesa
        this.mes = mes
        // Inicializa o dia da despesa
        this.dia = dia
        // Inicializa o tipo da despesa (por exemplo, alimentação, transporte)
        this.tipo = tipo
        // Inicializa a descrição da despesa
        this.descricao = descricao
        // Inicializa o valor monetário da despesa
        this.valor = valor
    }

    validarDados(){
        for(let i in this){
            if(this[i] == undefined || this[i] == '' || this[i] == null){
                return false
            }
        }
        return true
    }
}

// Classe para interagir com o localStorage e armazenar as despesas
class Bd {
    constructor() {
        // Verifica se já existe um ID de controle no localStorage, caso contrário, inicializa com 0
        let id = localStorage.getItem('id')

        if (id === null) {
            // Define o ID inicial como 0 para indicar que ainda não existem despesas salvas
            localStorage.setItem('id', 0)
        }
    }

    // Método que retorna o próximo ID a ser utilizado para salvar uma nova despesa
    getProximoId() {
        let proximoId = localStorage.getItem('id')  // Recupera o último ID salvo no localStorage
        return parseInt(proximoId) + 1  // Incrementa 1 ao último ID para obter o próximo
    }

    // Método que grava uma nova despesa no localStorage
    gravar(d) {
        let id = this.getProximoId()  // Obtém o próximo ID disponível
        // Converte o objeto despesa em uma string JSON e salva no localStorage com o ID como chave
        localStorage.setItem(id, JSON.stringify(d)) 
        // Atualiza o ID no localStorage para manter controle do próximo ID a ser utilizado
        localStorage.setItem('id', id)
    }

    recuperarTodosRegistros(){
        // Array de despesas
        let despesas = Array()

        let id = localStorage.getItem('id')

        // Recupera todas as despesas cadastradas em localStorage
        for(let i = 1; i <= id; i++){
            // Recupera a despesa e converte para um objeto literal
            let despesa = JSON.parse(localStorage.getItem(i))

            // Verifica se houve itens removidos, caso tenha, pulará ela e passará para o próximo  índice vazio
            if(despesa === null){
                continue
            }
            despesa.id = i
            despesas.push(despesa)  
        }
        return despesas
    }

    pesquisar(despesa){
        let despesasFiltradas = Array()
        despesasFiltradas = this.recuperarTodosRegistros()
    
        // Ano
        if (despesa.ano !== ''){
            despesasFiltradas = despesasFiltradas.filter(d => d.ano == despesa.ano)  
        }
        // Mes
        if (despesa.mes !== ''){
            despesasFiltradas = despesasFiltradas.filter(d => d.mes == despesa.mes)  
        }
        // Dia
        if (despesa.dia !== ''){
            despesasFiltradas = despesasFiltradas.filter(d => d.dia == despesa.dia)  
        }
        // Tipo
        if (despesa.tipo !== ''){
            despesasFiltradas = despesasFiltradas.filter(d => d.tipo == despesa.tipo)  
        }
        // Descrição
        if (despesa.descricao !== ''){
            despesasFiltradas = despesasFiltradas.filter(d => d.descricao == despesa.descricao)  
        }
        // Valor
        if (despesa.valor !== ''){
            despesasFiltradas = despesasFiltradas.filter(d => d.valor == despesa.valor)  
        }
        return despesasFiltradas
    }

    remover(id){
        localStorage.removeItem(id)
    }
}

// Instancia a classe Bd para manipulação das despesas no localStorage
let bd = new Bd()

// Função que captura os dados do formulário e cadastra uma nova despesa
function cadastrarDespesa() {
    // Obtém os valores dos campos do formulário para criar uma nova despesa
    let ano = document.getElementById('ano')
    let mes = document.getElementById('mes')
    let dia = document.getElementById('dia')
    let tipo = document.getElementById('tipo')
    let descricao = document.getElementById('descricao')
    let valor = document.getElementById('valor')

    // Cria um objeto despesa com os dados capturados
    let despesa = new Despesa(ano.value, mes.value, dia.value, tipo.value, descricao.value, valor.value)

    if(despesa.validarDados()){
       // Grava a despesa no localStorage através da instância bd da classe Bd
        bd.gravar(despesa) 

        document.getElementById('modalTitulo').innerHTML = 'Registro inserido com sucesso'
        document.getElementById('modalTituloDiv').className = 'modal-header text-success'
        document.getElementById('modalConteudo').innerHTML = 'A despesa foi cadastrada com sucesso'
        document.getElementById('modalBtn').innerHTML = 'Voltar' 
        document.getElementById('modalBtn').className = 'btn btn-success'

        $('#modalRegistroDespesa').modal('show')

        ano.value = ''
        mes.value  = ''
        dia.value  = ''
        tipo.value  = ''
        descricao.value  = ''
        valor.value  = ''
    } else {
        document.getElementById('modalTitulo').innerHTML = 'Erro na inclusão do registro'
        document.getElementById('modalTituloDiv').className = 'modal-header text-danger'
        document.getElementById('modalConteudo').innerHTML = 'Preencha todos os campos para que a despesa seja cadastrada'
        document.getElementById('modalBtn').innerHTML = 'Voltar e corrigir' 
        document.getElementById('modalBtn').className = 'btn btn-danger'

        $('#modalRegistroDespesa').modal('show')
    } 
}

function carregaListaDespesas(despesas = Array(), filtro = false){
    if(despesas.length == 0 && filtro == false){
        despesas = bd.recuperarTodosRegistros()
    }

    // Selecionando o elemento tbody da tabela
    let listaDespesas = document.getElementById('listaDespesas')

    listaDespesas.innerHTML = ''

    // Percorrer o Array despesas, listando cada despesa de forma dinâmica
    despesas.forEach(function(d){
        // Criando a linha(tr)
        let linha = listaDespesas.insertRow()  // Esse método faz parte do elemento tbody e possibilita a inserção de linhas
    
        // Criando as colunas(td)
        linha.insertCell(0).innerHTML = `${d.dia}/${d.mes}/${d.ano}` // Esse método cria as colunas partindo da posição 0
        // Ajustar o tipo 
        switch(d.tipo){
            case '1':d.tipo = 'Alimentação'
                break
            case '2':d.tipo = 'Educação'
                break
            case '3':d.tipo = 'Lazer'
                break
            case '4':d.tipo = 'Saúde'
                break
            case '5':d.tipo = 'Transporte'
                break
        }
        linha.insertCell(1).innerHTML = d.tipo 
        linha.insertCell(2).innerHTML = d.descricao
        linha.insertCell(3).innerHTML = d.valor
        // Criar botão de exclusão
        let btn = document.createElement("button")
        btn.className = 'btn btn-danger'
        btn.innerHTML = '<i class="fas fa-times"></i>'
        btn.id = `id_despesa_${d.id}`
        btn.onclick = function(){   // Remover despesa
            let id = this.id.replace('id_despesa_', '')
            bd.remover(id)
            window.location.reload()
        }
        linha.insertCell(4).append(btn)
    })
}

function pesquisarDespesa(){
    let ano = document.getElementById('ano').value
    let mes = document.getElementById('mes').value
    let dia = document.getElementById('dia').value
    let tipo = document.getElementById('tipo').value
    let descricao = document.getElementById('descricao').value
    let valor = document.getElementById('valor').value

    let despesa = new Despesa(ano, mes, dia, tipo, descricao, valor)

    let despesas = bd.pesquisar(despesa)

    this.carregaListaDespesas(despesas, true)
}