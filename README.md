# AppOrcamentoPessoal

Aplicativo web simples para controle de despesas pessoais. Funciona direto no navegador, sem servidor nem banco de dados: os dados ficam salvos no `localStorage`.

## Funcionalidades

- **Cadastro** (`index.html`): registra despesas com data, categoria, descrição e valor (aceita `1.234,56` ou `1234.56`), com validação dos campos. Mostra o total gasto no mês atual e os últimos lançamentos.
- **Consulta** (`consulta.html`): filtra por ano, mês, dia, categoria, faixa de valor e trecho da descrição (sem diferenciar maiúsculas ou acentos). Mostra o total filtrado, permite editar e excluir lançamentos e exportar o resultado para CSV (abre no Excel).
- **Resumo** (`resumo.html`): total gasto no mês, comparação com o mês anterior, gastos por categoria e limites de orçamento mensais com barra de progresso.

Categorias: Alimentação, Educação, Lazer, Saúde, Transporte, Moradia e Outros.

## Como usar

Abra o `index.html` no navegador, ou sirva a pasta com a extensão Live Server do VS Code.

Despesas salvas pela versão anterior do app são migradas automaticamente para o novo formato na primeira vez que a página é aberta.

## Tecnologias

HTML, CSS, JavaScript puro, Bootstrap 5 e Bootstrap Icons.
