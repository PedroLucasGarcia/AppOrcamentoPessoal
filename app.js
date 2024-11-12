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
}

// Instancia a classe Bd para manipulação das despesas no localStorage
let bd = new Bd()

// Função que captura os dados do formulário e cadastra uma nova despesa
function cadastrarDespesa() {
    // Obtém os valores dos campos do formulário para criar uma nova despesa
    let ano = document.getElementById('ano').value
    let mes = document.getElementById('mes').value
    let dia = document.getElementById('dia').value
    let tipo = document.getElementById('tipo').value
    let descricao = document.getElementById('descricao').value
    let valor = document.getElementById('valor').value

    // Cria um objeto despesa com os dados capturados
    let despesa = new Despesa(ano, mes, dia, tipo, descricao, valor)

    // Grava a despesa no localStorage através da instância bd da classe Bd
    bd.gravar(despesa)
}
