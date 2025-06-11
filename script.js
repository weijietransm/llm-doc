document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('fileInput');
    const apiKeyInput = document.getElementById('apiKey');
    const processBtn = document.getElementById('processBtn');
    const fileNameDisplay = document.getElementById('file-name');
    const resultContainer = document.getElementById('resultContainer');
    const timeoutInput = document.getElementById('timeout');
    const includeMetadataInput = document.getElementById('include-metadata');
    const loader = document.getElementById('loader');
    const dropArea = document.getElementById('drop-area');
    const filePreview = document.getElementById('filePreview');

    // ===== Drag and drop functionality =====
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, unhighlight, false);
    });

    function highlight() {
        dropArea.classList.add('highlight');
    }

    function unhighlight() {
        dropArea.classList.remove('highlight');
    }

    dropArea.addEventListener('drop', handleDrop, false);

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;

        if (files.length > 0) {
            fileInput.files = files;
            handleFileSelect(files[0]);
        }
    }

    // ===== File selection handling =====
    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) {
            handleFileSelect(fileInput.files[0]);
        }
    });

    function handleFileSelect(file) {
        fileNameDisplay.textContent = file.name;
        validateForm();
        previewFile(file);
    }

    // ===== File preview functionality =====
    function previewFile(file) {
        filePreview.innerHTML = '';
        
        // Display appropriate preview based on file type
        if (file.type.startsWith('image/')) {
            // Image preview
            const img = document.createElement('img');
            img.classList.add('image-preview');
            img.file = file;
            filePreview.appendChild(img);
            
            const reader = new FileReader();
            reader.onload = (e) => { img.src = e.target.result; };
            reader.readAsDataURL(file);
        } else if (file.type === 'application/pdf') {
            // PDF preview
            const obj = document.createElement('object');
            obj.classList.add('pdf-preview');
            obj.type = 'application/pdf';
            
            const reader = new FileReader();
            reader.onload = (e) => { obj.data = e.target.result; };
            reader.readAsDataURL(file);
            
            filePreview.appendChild(obj);
        } else if (file.type === 'text/plain' || file.type === 'text/csv' || 
                  file.type === 'application/json' || file.name.endsWith('.txt') || 
                  file.name.endsWith('.csv') || file.name.endsWith('.json')) {
            // Text file preview
            const pre = document.createElement('pre');
            pre.classList.add('text-preview');
            
            const reader = new FileReader();
            reader.onload = (e) => { 
                pre.textContent = e.target.result.substring(0, 5000); // Limit preview size
                if (e.target.result.length > 5000) {
                    pre.textContent += '\n\n[File too large to display completely]';
                }
            };
            reader.readAsText(file);
            
            filePreview.appendChild(pre);
        } else {
            // Generic file info for other file types
            const info = document.createElement('div');
            info.classList.add('file-info');
            info.innerHTML = `
                <p><strong>File name:</strong> ${file.name}</p>
                <p><strong>File type:</strong> ${file.type || 'Unknown'}</p>
                <p><strong>File size:</strong> ${formatFileSize(file.size)}</p>
                <p class="no-preview">Preview not available for this file type</p>
            `;
            filePreview.appendChild(info);
        }
    }

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // ===== Form validation =====
    function validateForm() {
        processBtn.disabled = fileInput.files.length === 0;
    }

    // ===== Process button click handler =====
    processBtn.addEventListener('click', processDocument);

    function processDocument() {
        // Show loader and clear previous results
        loader.hidden = false;
        resultContainer.innerHTML = '';
        processBtn.disabled = true;

        // Get values
        const apiKey = apiKeyInput.value.trim();
        const timeout = timeoutInput.value || '300';
        const includeMetadata = includeMetadataInput.value === 'true';

        // Create request
        const myHeaders = new Headers();
        myHeaders.append("Authorization", `Bearer ${apiKey}`);
        
        const formdata = new FormData();
        formdata.append("files", fileInput.files[0], "file");
        formdata.append("timeout", timeout);
        formdata.append("include_metadata", includeMetadata.toString());
        
        const requestOptions = { 
            method: 'POST', 
            body: formdata, 
            redirect: 'follow', 
            headers: myHeaders 
        };

        // Use local proxy server instead of direct API call to avoid CORS issues
        fetch("/api/packinglist", requestOptions)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(result => {
                displayResult(result, 'success');
            })
            .catch(error => {
                displayResult(`Error: ${error.message}`, 'error');
            })
            .finally(() => {
                loader.hidden = true;
                processBtn.disabled = false;
            });
    }

    function displayResult(result, type) {
        // Clear previous content
        resultContainer.innerHTML = '';

        if (type === 'error') {
            resultContainer.innerHTML = `<p class="error">${result}</p>`;
            return;
        }

        try {            
            // Extract packing list data from the nested structure
            let packingData = null;
            
            // Check for the specific structure shown in the console log
            if (result && 
                result.message && 
                result.message.result && 
                Array.isArray(result.message.result) && 
                result.message.result[0] && 
                result.message.result[0].result && 
                result.message.result[0].result.output && 
                result.message.result[0].result.output["Packing List_1"]) {
                
                packingData = result.message.result[0].result.output["Packing List_1"];
            }
            // Check for other structures as fallback
            else if (result && result.result && result.result.output && result.result.output["Packing List_1"]) {
                packingData = result.result.output["Packing List_1"];
            } 
            else if (result && result.output && result.output["Packing List_1"]) {
                packingData = result.output["Packing List_1"];
            }
            else if (result && result["Packing List_1"] && Array.isArray(result["Packing List_1"])) {
                packingData = result["Packing List_1"];
            }
            // Direct array check
            else if (Array.isArray(result) && result.length > 0 && result[0].item_name) {
                packingData = result;
            }
            
            if (packingData && Array.isArray(packingData)) {
                showPackingListTable(packingData);
            } else {
                // If we couldn't find packing list data in the expected structure,
                // display the raw JSON
                const formattedResult = typeof result === 'string'
                    ? result
                    : JSON.stringify(result, null, 2);

                const pre = document.createElement('pre');
                pre.classList.add('success');
                pre.textContent = formattedResult;
                resultContainer.appendChild(pre);
            }
            
        } catch (e) {
            console.error("Error processing result:", e);
            // Fallback to displaying raw JSON if there's an error in formatting
            const formattedResult = typeof result === 'string'
                ? result
                : JSON.stringify(result, null, 2);

            const pre = document.createElement('pre');
            pre.classList.add('success');
            pre.textContent = formattedResult;
            resultContainer.appendChild(pre);
        }
    }

    // Separate function to create and display the table
    function showPackingListTable(packingData) {
        // Create table element
        const table = document.createElement('table');
        table.className = 'packing-list-table';
        
        // Create table header
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        
        // Get all possible keys from all items for headers
        const allKeys = new Set();
        packingData.forEach(item => {
            Object.keys(item).forEach(key => allKeys.add(key));
        });
        
        // Define preferred header order
        const preferredOrder = [
            'package_no',
            'item_name',
            'quantity',
            'material',
            'gross_weight',
            'dimension',
            'volume'
        ];
        
        // Sort keys according to preferred order
        const sortedKeys = Array.from(allKeys).sort((a, b) => {
            // If both keys are in preferred order, sort by their position
            if (preferredOrder.includes(a) && preferredOrder.includes(b)) {
                return preferredOrder.indexOf(a) - preferredOrder.indexOf(b);
            }
            // If only a is in preferred order, a comes first
            else if (preferredOrder.includes(a)) {
                return -1;
            }
            // If only b is in preferred order, b comes first
            else if (preferredOrder.includes(b)) {
                return 1;
            }
            // If neither is in preferred order, sort alphabetically
            else {
                return a.localeCompare(b);
            }
        });
        
        // Create header cells
        sortedKeys.forEach(key => {
            const th = document.createElement('th');
            th.textContent = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            headerRow.appendChild(th);
        });
        
        thead.appendChild(headerRow);
        table.appendChild(thead);
        
        // Create table body
        const tbody = document.createElement('tbody');
        
        // Add data rows
        packingData.forEach(item => {
            const row = document.createElement('tr');
            
            // Add cells for each column in the same order as headers
            sortedKeys.forEach(key => {
                const cell = document.createElement('td');
                cell.textContent = item[key] || '';
                row.appendChild(cell);
            });
            
            tbody.appendChild(row);
        });
        
        table.appendChild(tbody);

        // Add table to result container
        resultContainer.appendChild(table);
        
        // Add download button for CSV export
        const downloadBtn = document.createElement('button');
        downloadBtn.textContent = 'Download as CSV';
        downloadBtn.className = 'download-btn';
        downloadBtn.addEventListener('click', () => {
            exportToCSV(packingData, 'packing_list', sortedKeys);
        });
        resultContainer.appendChild(downloadBtn);
    }
    
    // Updated function to export data to CSV with specific column order
    function exportToCSV(data, filename, columnOrder = null) {
        // If no column order is specified, get all unique keys
        const headers = columnOrder || Array.from(
            new Set(data.flatMap(item => Object.keys(item)))
        );
        
        // Create CSV content
        let csvContent = headers.map(header => 
            header.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
        ).join(',') + '\n';
        
        // Add data rows
        data.forEach(item => {
            const row = headers.map(header => {
                let value = item[header] || '';
                // Escape quotes and wrap value in quotes if it contains commas or quotes
                if (String(value).includes(',') || String(value).includes('"')) {
                    value = '"' + String(value).replace(/"/g, '""') + '"';
                }
                return value;
            });
            csvContent += row.join(',') + '\n';
        });
        
        // Create download link
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', filename + '.csv');
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
});
