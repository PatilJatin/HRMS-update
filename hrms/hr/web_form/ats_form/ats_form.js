frappe.ready(function() {
    // Load PDF.js library
    function loadPdfJs(callback) {
        var script = document.createElement('script');
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.5.207/pdf.min.js";
        script.onload = callback;
        document.head.appendChild(script);
    }

    // Extract text from PDF
    function extractTextFromPDF(url) {
        fetch(url).then(response => response.arrayBuffer()).then(function(buffer) {
            let typedarray = new Uint8Array(buffer);

            loadPdfJs(function() {
                pdfjsLib.getDocument(typedarray).promise.then(function(pdf) {
                    pdf.getPage(1).then(function(page) {
                        page.getTextContent().then(function(textContent) {
                            let resume_text = textContent.items.map(item => item.str).join(' ');
                            console.log(resume_text);
                            $('textarea[data-fieldname="resume_text"]').val(resume_text);
                            calculateATSScore(resume_text);
                        });
                    });
                });
            });
        });
    }

    // Show error message
    function showError(message) {
        frappe.msgprint({
            title: __('Error'),
            indicator: 'red',
            message: __(message)
        });
    }

    // Calculate ATS score
    async function calculateATSScore(resume_text) {
        let job_title = $('input[data-fieldname="job_title"]').val();

        if (!job_title) {
            showError('Job Opening is required.');
            return;
        }

        frappe.call({
            method: 'frappe.client.get',
            args: {
                doctype: 'Job Opening',
                name: job_title
            },
            callback: async function(r) {
                if (r.message) {
                    let job_description_html = r.message.description;
                    let job_description = $(job_description_html).text();
                    console.log(job_description);

                    const ats_score = await getATSScore(resume_text, job_description);
                    console.log('ATS Score:', ats_score);
                    $('input[data-fieldname="ats_score"]').val(ats_score + '%');
                }
            }
        });
    }

    // Fetch ATS score from OpenAI API
    async function getATSScore(resume_text, job_description) {
        const api_key = `key`;
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${api_key}`
            },
            body: JSON.stringify({
                model: "gpt-4",
                messages: [
                    {
                        role: "system",
                        content: `You are an Applicant Tracking System designed to fetch resumes based on a Job Description (JD). Given the JD below, extract resume data and format it according to the specified output format.
                        Job Description: ${job_description}
                        Resume: ${resume_text}

Your task is to parse the provided resume data, match it with the job description, and provide the output in a single string with the structure:
"Job Description Match: [percentage]%".`
                    },
                    {
                        role: "user",
                        content: `Job Description Match: ${job_description}`
                    }
                ],
                max_tokens: 2000,
                temperature: 0.5
            })
        });

        const data = await response.json();
        const ats_score = extractScoreFromResponse(data.choices[0].message.content);
        console.log("ats_score", ats_score);
        return ats_score;
    }

    // Extract ATS score from response
    function extractScoreFromResponse(response_text) {
        let score = 0;
        try {
            console.log("response_text", response_text);
            const match = response_text.match(/Job Description Match: (\d+)%/);
            if (match) {
                score = parseInt(match[1]);
            }
        } catch (error) {
            console.error('Error extracting ATS score:', error);
        }
        return score;
    }

    // Watch for changes in the file link element
    function watchFileLink() {
        setInterval(function() {
            const fileLink = $('.attached-file-link').attr('href');
            if (fileLink && fileLink !== currentFileLink) {
                currentFileLink = fileLink;
                console.log("link", fileLink);
                extractTextFromPDF(fileLink);
            }
        }, 1000);
    }

    // Watch for changes in the job title field
    function watchJobTitle() {
        $('input[data-fieldname="job_title"]').on('change', function() {
            const resume_text = $('textarea[data-fieldname="resume_text"]').val();
            if (resume_text) {
                calculateATSScore(resume_text);
            }
        });
    }

    // Initial call to watch for file link and job title changes
    let currentFileLink = '';
    watchFileLink();
    watchJobTitle();

    // Hide the resume_text and ats_score fields
    function hideFields() {
        $('div[data-fieldname="resume_text"]').hide();
        $('div[data-fieldname="ats_score"]').hide();
    }

    // Call hideFields when the form is ready
    hideFields();

    // Make job_title field read-only if present
    function makeJobTitleReadOnly() {
        const jobTitleField = $('input[data-fieldname="job_title"]');
        if (jobTitleField.length) {
            jobTitleField.attr('readonly', true);
        }
    }

    // Call hideFields and makeJobTitleReadOnly when the form is ready
    hideFields();
   
});
