frappe.ready(function() {
    // Fetch policies and populate the policy field
    frappe.call({
        method: "frappe.client.get_list",
        args: {
            doctype: "Policy",
            fields: ["name", "policy_title"]
        },
        callback: function(r) {
            if (r.message) {
                var options = [];
                $.each(r.message, function(i, d) {
                    options.push({label: d.policy_title, value: d.name});
                });
                // Populate policy field with fetched policies
                var policyField = $('[data-fieldname="policy"]');
                if (policyField.length > 0) {
                    policyField.awesomplete.list = options;
                }
            }
        }
    });

    // Set employee field to logged-in user
    frappe.call({
        method: "frappe.client.get_value",
        args: {
            doctype: "Employee",
            filters: {"user_id": frappe.session.user},
            fieldname: "name"
        },
        callback: function(r) {
            if (r.message) {
                $('[data-fieldname="employee"]').val(r.message.name);
            }
        }
    });
});
