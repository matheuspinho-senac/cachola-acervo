document.addEventListener("DOMContentLoaded", function () {
    const eixoSelect = document.getElementById("eixo");
    const segmentoSelect = document.getElementById("segmento");
    const tipoCursoSelect = document.getElementById("tipoCurso");
    const formatoSelect = document.getElementById("formato");
    const autorInput = document.getElementById("autor");
    const palavrasChaveInput = document.getElementById("palavrasChave");
    const resultsContainer = document.getElementById("results");
    const quantidadeResultados = document.getElementById("quantidadeResultados");
    const additionalFilters = document.querySelectorAll('.keywords, #autor, #formato');
    const additionalLabels = document.querySelectorAll('label[for="autor"], label[for="formato"]');

       // Configurações iniciais
       let currentPage = 1;
       let itemsPerPage = 15;
       let filteredResults = [];
       let segmentos = [];
       let acervo = [];

        //função pra lidar com as strings que tem acento, cedilha, etc...
        function normalizeString(str) {
        if (!str) return '';
        return str
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Remove acentos
            .trim();
    }

    // Função para esconder os filtros e labels
function hideAdditionalFilters() {
    additionalFilters.forEach(filter => {
        if (filter.closest('.form-group')) {
            filter.closest('.form-group').style.display = 'none';
        }
    });
    additionalLabels.forEach(label => {
        label.style.display = 'none';
    });
}

// função para mostrar filtros e labels dos 3 filtros escondidos
function showAdditionalFilters() {
    additionalFilters.forEach(filter => {
        if (filter.closest('.form-group')) {
            filter.closest('.form-group').style.display = 'block';
        }
    });
    additionalLabels.forEach(label => {
        label.style.display = 'block';
    });
}

// Inicialmente esconder os filtros
hideAdditionalFilters();


    // Função para criar controles de paginação
function createPagination(totalItems) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const paginationDiv = document.createElement('div');
    paginationDiv.className = 'pagination-controls';
    
    const prevButton = document.createElement('button');
    prevButton.className = 'pagination-button prev';
    prevButton.innerHTML = '<i class="fa-solid fa-angle-left"></i>';
    prevButton.disabled = currentPage === 1;
    
    const pageInfo = document.createElement('span');
    pageInfo.className = 'page-info';
    pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;
    
    const nextButton = document.createElement('button');
    nextButton.className = 'pagination-button next';
    nextButton.innerHTML = '<i class="fa-solid fa-angle-right"></i>';
    nextButton.disabled = currentPage === totalPages;
    
    prevButton.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            window.scrollTo({ top: 0, behavior: 'smooth' });
            displayResults(filteredResults);
        }
    });
    
    nextButton.addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage++;
            window.scrollTo({ top: 0, behavior: 'smooth' });
            displayResults(filteredResults);
        }
    });
    
    paginationDiv.appendChild(prevButton);
    paginationDiv.appendChild(pageInfo);
    paginationDiv.appendChild(nextButton);
    
    return paginationDiv;
}

   

    // Carregar os JSONs
    function loadJSON() {
        return Promise.all([
            $.getJSON('segmentos.json'),
            $.getJSON('acervo.json')
        ]).then(([segmentosData, acervoData]) => {
            segmentos = segmentosData.filter(item => item.Perfil === "Aluno");
            acervo = acervoData;
            populateEixoOptions();
            populateFormatoOptions();
            clearResults(); 
        }).catch(error => {
            console.error("Erro ao carregar os arquivos JSON: ", error);
        });
    }

    // Popular opções de Eixo Tecnológico
    function populateEixoOptions() {
        const eixos = [...new Set(segmentos.map(item => item["Eixo Tecnológico"]))];
        populateSelect(eixoSelect, eixos);
    }

    // Função helper para processar segmentos
    function processSegmentos(segmentosString) {
        if (!segmentosString) return [];
        
        // Divide por ponto e vírgula e limpa cada segmento
        return segmentosString
            .split(";")
            .map(seg => seg.trim()) // Remove espaços no início e fim de cada segmento
            .filter(seg => seg && !normalizeString(seg).startsWith("falso"));
    }

    // Atualizar opções de Tipo de Curso quando Eixo é selecionado
    eixoSelect.addEventListener("change", function () {
        const eixoSelecionado = eixoSelect.value;
        
        // Limpar e resetar selects
        tipoCursoSelect.value = "";
        segmentoSelect.value = "";
        hideAdditionalFilters();
        clearResults();
        
        if (eixoSelecionado) {
            // Obter tipos de curso únicos para o eixo selecionado
            const tiposCurso = new Set();
            segmentos
                .filter(item => item["Eixo Tecnológico"] === eixoSelecionado)
                .forEach(item => {
                    item["Tipo de Curso"].split(";")
                        .map(tipo => tipo.trim())
                        .filter(tipo => tipo)
                        .forEach(tipo => tiposCurso.add(tipo));
                });
            
            populateSelect(tipoCursoSelect, Array.from(tiposCurso));
        } else {
            populateSelect(tipoCursoSelect, []);
            populateSelect(segmentoSelect, []);
        }
    });

    // Atualizar Segmentos quando o Tipo de Curso é selecionado
    tipoCursoSelect.addEventListener("change", function () {
        const eixoSelecionado = eixoSelect.value;
        const tipoCursoSelecionado = tipoCursoSelect.value;
        
        if (eixoSelecionado && tipoCursoSelecionado) {
            const segmentosValidos = segmentos
                .filter(item => 
                    item["Eixo Tecnológico"] === eixoSelecionado &&
                    item["Tipo de Curso"].split(";").map(t => t.trim()).includes(tipoCursoSelecionado)
                )
                .flatMap(item => processSegmentos(item.Segmentos));
            
            populateSelect(segmentoSelect, [...new Set(segmentosValidos)]);
            
          
        } else {
            populateSelect(segmentoSelect, []);
            clearResults();
            hideAdditionalFilters();
        }
    });

    // Filtrar resultados quando segmento é selecionado
    segmentoSelect.addEventListener("change", function() {
        if (eixoSelect.value && tipoCursoSelect.value && segmentoSelect.value) {
            showAdditionalFilters();
            filterResults();
        } else {
            hideAdditionalFilters();
            clearResults();
        }
    });

//filtrar resultados
    function filterResults() {
    const segmentoSelecionado = segmentoSelect.value;
    const formato = formatoSelect.value;
    const autor = autorInput.value;
    const palavrasChave = palavrasChaveInput.value;

    const cursosFiltrados = acervo.filter(curso => {
        // Split the segments string into an array, handling different formats
        const segmentosArray = curso.Segmentos
            ? curso.Segmentos.split(';')
                .map(seg => seg.trim()) // Remove whitespace
                .filter(seg => seg && !seg.toLowerCase().startsWith('falso')) // Remove empty and 'falso' entries
            : [];

        // Check for exact segment match
        const matchSegmento = !segmentoSelecionado || 
            segmentosArray.some(segmento => {
                // Normalize both strings for comparison
                const normalizedSegmento = normalizeString(segmento);
                const normalizedBusca = normalizeString(segmentoSelecionado);
                
                // Check for exact match
                return normalizedSegmento === normalizedBusca;
            });

        // Additional filters remain the same
        const matchFormato = !formato || curso.Formato === formato;
        const matchAutor = !autor || 
            normalizeString(curso.Autor).includes(normalizeString(autor));
        const matchKeywords = !palavrasChave || 
            [
                curso.ISBN,
                curso.Segmentos,
                curso["Título do conteúdo"],
                curso["Sub-título"],
                curso["Curso; Compêtencias e Assuntos"]
            ].some(field => field && 
                normalizeString(field).includes(normalizeString(palavrasChave))
            );

        return matchSegmento && matchFormato && matchAutor && matchKeywords;
    });

        console.log(`Total de resultados encontrados: ${cursosFiltrados.length}`);

        filteredResults = cursosFiltrados;
        currentPage = 1;
        displayResults(cursosFiltrados);
    }

    // Função helper para popular selects
    function populateSelect(selectElement, options) {
        selectElement.innerHTML = '<option value="">Selecione...</option>';
        options.forEach(option => {
            if (option.trim() !== "") {
                const optionElement = document.createElement("option");
                optionElement.value = option;
                optionElement.textContent = option;
                selectElement.appendChild(optionElement);
            }
        });
    }

    // Popular opções de Formato
    function populateFormatoOptions() {
        const formatos = [...new Set(acervo.map(curso => curso.Formato))];
        populateSelect(formatoSelect, formatos);
    }

    function clearResults() {
        resultsContainer.innerHTML = "";
        quantidadeResultados.innerHTML = `
            <div class="loading-container">
                <span>Aguardando seleção do usuário</span>
                <img src="assets/load.gif" alt="Loading" class="loading-gif">
            </div>
        `;
        filteredResults = [];
    }

    // Exibir resultados
    function displayResults(cursos) {
        resultsContainer.innerHTML = "";
        quantidadeResultados.textContent = `${cursos.length} Conteúdos encontrados`;

        if (cursos.length === 0) {
            resultsContainer.innerHTML = "<p>Nenhum conteúdo encontrado.</p>";
            return;
        }

        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedItems = cursos.slice(startIndex, endIndex);

        const itemsContainer = document.createElement('div');
        itemsContainer.className = 'card-container';

        paginatedItems.forEach(curso => {
            const card = document.createElement("div");
            card.className = 'card';
            card.innerHTML = `
                <h2 class="card-title">${curso["Título do conteúdo"]}</h2>
                <div class="card-content">
                    <img src="${curso["CAPA 1"]}" alt="Capa do conteúdo" class="card-image">
                    <div class="card-texts">
                        <p><strong>Autor:</strong> ${curso.Autor}</p>
                        <p><strong>Segmento:</strong> ${curso.Segmentos}</p>
                        <p><strong>Formato:</strong> ${curso.Formato} ${getFormatoIcon(curso.Formato)}</p>
                        <p><strong>ISBN:</strong> ${curso.ISBN}</p>
                    </div>
                </div>
                <div class="card-button">
                    <a href="${curso.URL}" target="_blank" style="text-decoration: none">
                        <button class="access-button">
                            <span id="span-button">Clique aqui para acessar o conteúdo</span>
                        </button>
                    </a>
                </div>
            `;
            itemsContainer.appendChild(card);
        });

        resultsContainer.appendChild(itemsContainer);

        if (cursos.length > itemsPerPage) {
            const paginationControls = createPagination(cursos.length);
            resultsContainer.appendChild(paginationControls);
        }
    }

    // Inicializar eventos para filtros adicionais
    [formatoSelect, autorInput, palavrasChaveInput].forEach(element => {
        element.addEventListener("input", () => {
            if (eixoSelect.value && tipoCursoSelect.value && segmentoSelect.value) {
                filterResults();
            }
        });
    });

    // Função auxiliar para ícones de formato
    function getFormatoIcon(formato) {
        const formatoLower = formato.toLowerCase();
        if (formatoLower === "mp4") {
            return '<i class="fa-solid fa-video" style="color: #000000;"></i>';
        } else if (formatoLower === "mp3") {
            return '<i class="fa-solid fa-headphones" style="color: #000000;"></i>';
        } else {
            return '<i class="fa-solid fa-book" style="color: #000000;"></i>';
        }
    }

    // Inicialização
    loadJSON();
});