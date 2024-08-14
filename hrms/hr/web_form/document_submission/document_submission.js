frappe.ready(function() {
	// bind events here

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
})