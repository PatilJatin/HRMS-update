frappe.ready(function() {
    function loadPdfJs(callback) {
        var script = document.createElement('script');
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.5.207/pdf.min.js";
        script.onload = callback;
        document.head.appendChild(script);
    }

    function extractTextFromPDF(file) {
        let reader = new FileReader();
        reader.onload = function(event) {
            let typedarray = new Uint8Array(event.target.result);

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
        };
        reader.readAsArrayBuffer(file);
    }

    $('<button class="btn btn-primary">Attach Resume</button>').appendTo('.web-form-actions').on('click', function() {
        $('<input type="file" accept=".pdf" />').on('change', function(e) {
            let file = e.target.files[0];
            if (file) {
                extractTextFromPDF(file);
            }
        }).click();
    });

    async function calculateATSScore(resume_text) {
        let job_title = $('input[data-fieldname="job_title"]').val();

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

    async function getATSScore(resume_text, job_description) {
    const api_key = `sk-proj-f7MLW2ol5IGZ6fxjamVeT3BlbkFJbGqJVoERUxElgy9pbdel`;
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
                    content: ` You are an Applicant Tracking System designed to fetch resumes based on a Job Description (JD). Given the JD below, extract resume data and format it according to the specified output format. 
                    Job Description: ${job_description}
                      Resume: ${resume_text}

Your task is to parse the provided resume data, match it with the job description, and provide the output in a single string with the structure: 
"Job Description Match: [percentage]%".

Output Format:
Provide the output in the following format:
Name: [Candidate Name]
Contact Information: [Candidate Email]
Summary of Experience: [Brief summary highlighting relevant experience]
Key Skills: [List of key skills]
Education: [Educational background]
Relevant Experience with [Preferred Qualifications]: [Details of relevant experience, if any]
Certifications: [List of certifications, if any]

Example Output:
Name: [Candidate Name]
Contact Information: [Candidate Email]
Summary of Experience: [Brief summary highlighting relevant experience]
Key Skills: [List of key skills]
Education: [Educational background]
Relevant Experience with [Preferred Qualifications]: [Details of relevant experience, if any]
Certifications: [List of certifications, if any]
Link to Full Resume: [URL to full resume] (not required)

Return the response in one single string having the structure: "Job Description Match: [percentage]%".
 `,
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

    // Ensure fields exist before trying to attach event handlers
    
});
