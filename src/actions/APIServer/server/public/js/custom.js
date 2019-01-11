$(function() {
    let token = getToken();
    if(!token) {
        redirectToLogin();
    } else {
        console.log('ada token');
        $('.loader').fadeOut('fast', function() {
            $('.main-page').fadeIn('fast');
        });
    }

    let inviteForm = document.getElementById("stfInvite");
    if(inviteForm) {
        let dataForm = {
            'firstname': "stfFirstname",
            'lastname': "stfLastname",
            'email': "stfEmail",
            'phone': "stfPhone",
            'invitation_status': "stfInvitationStatus"
        }
        additional = document.getElementById("stfAdditional");

        inviteForm.addEventListener("submit", function(event) {
            event.preventDefault();
            console.log('submit');

            let validation = true;
            $.each(dataForm, function(i, val) {
                valElm = document.getElementById(val);
                if(!checkInput(valElm)) {
                    valElm.focus();
                    validation = false;
                    return false;
                }
            });

            if(!validation) return false;

            let data = {
                "first_name": document.getElementById(dataForm.firstname).value,
                "last_name": document.getElementById(dataForm.lastname).value,
                "email": document.getElementById(dataForm.email).value,
                "phone": document.getElementById(dataForm.phone).value,
                "additional_info": additional.value,
                "invitation_status": document.getElementById(dataForm.invitation_status).value
            };

            let authorizationToken = `Bearer ${getToken()}`;
    
            $.ajax({
                method: "POST",
                url: "https://app.suitetreat.com/api/v1/admin/users",
                data: data,
                beforeSend: function(request) {
                    request.setRequestHeader("Authorization", authorizationToken);

                    let domData = `
                        <div class="backdrop"><div class="form-loader">
                                loading...
                            </div>
                        </div>
                    `;
                    $(".form-suitetreat-container").append(domData);
                    $(".backdrop").show();
                },
            })
            .always(function() {
                $(".backdrop").hide().remove();
            }) 
            .fail(function(jqXHR, textStatus, errorThrown) {
                console.log(jqXHR, textStatus, errorThrown);
                let res = JSON.parse(jqXHR.responseText);
                tpNotify('danger', res.error.message[0]);
            })
            .done(function(res) {
                console.log(res);
                inviteForm.reset();
                tpNotify('success', res.message);
            });
        });
    }
});

$(document).on('click', '.btn-logout', function() {
    logout();
    redirectToLogin();
});

$('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
    console.log(e.target.text); // newly activated tab
    console.log(e.relatedTarget); // previous active tab
    getUsers(e.target.text);
});

function getUsers(status) {
    let data = {
        'status': status.toLowerCase()
    }

    $.ajax({
        method: "GET",
        url: "https://app.suitetreat.com/api/v1/admin/users",
        data: data,
        beforeSend: function(request) {
            let authorizationToken = `Bearer ${getToken()}`;
            request.setRequestHeader("Authorization", authorizationToken);

            let domData = `
                <div class="backdrop"><div class="form-loader">
                        loading...
                    </div>
                </div>
            `;
            $("#nav-tabContent").append(domData);
            $(".backdrop").show();
        },
    })
    .always(function() {
        $(".backdrop").hide().remove();
    }) 
    .fail(function(jqXHR, textStatus, errorThrown) {
        console.log(jqXHR, textStatus, errorThrown);
        let res = JSON.parse(jqXHR.responseText);
        tpNotify('danger', res.error.message[0]);
    })
    .done(function(res) {
        console.log(res);
        if(!res.success) return false;

        let tableContent = '';

        switch(status.toLowerCase()) {
            case 'new':
                res.users.forEach((user, idx) => {
                    console.log(user);
                    let approve = (user.status == 'approved') ? 'active' : '';
                    let reject = (user.status == 'rejected') ? 'active' : '';
                    let block = (user.status == 'blocked') ? 'active' : '';
                    tableContent += `
                        <tr>
                            <td class="font-weight-bold">${user.first_name} ${user.last_name}</td>
                            <td>${user.email}</td>
                            <td>${user.phone}</td>
                            <td>${user.registration}</td>
                            <td>
                                <div class="btn-group btn-group-toggle" data-toggle="buttons" data-id="${user._id}">
                                    <label class="btn btn-outline-success ${approve}">
                                        <input type="radio" name="actions" id="action1" autocomplete="off" checked> Approve
                                    </label>
                                    <label class="btn btn-outline-danger ${reject}">
                                        <input type="radio" name="actions" id="action2" autocomplete="off"> Reject
                                    </label>
                                    <label class="btn btn-outline-secondary ${block}">
                                        <input type="radio" name="actions" id="action3" autocomplete="off"> Block
                                    </label>
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td colspan="4">
                                <h6>additional data</h6>
                                Lorem ipsum dolor sit amet, his aeque nonumy fabulas te, te vix integre nostrum deseruisse, vim id populo aeterno maiorum.
                            </td>
                        </tr>
                    `;
                });

                if(!tableContent) {
                    tableContent = `
                        <tr>
                            <td colspan="5">
                                <div class="waiting text-center py-5">
                                    <img src="./assets/no-data.svg" alt="placeholder image">
                                </div>
                                <h5 class="text-center">No data...</h5>
                            </td>
                        </tr>
                    `;
                }
                $('#nav-new table tbody').html(tableContent);
                break;
            case 'approved':
                res.users.forEach((user, idx) => {
                    console.log(user);
                    let approve = (user.status == 'approved') ? 'active' : '';
                    let reject = (user.status == 'rejected') ? 'active' : '';
                    let block = (user.status == 'blocked') ? 'active' : '';
                    tableContent += `
                        <tr>
                            <td class="font-weight-bold">${user.first_name} ${user.last_name}</td>
                            <td>${user.email}</td>
                            <td>${user.phone}</td>
                            <td>${user.registration}</td>
                            <td>
                                <div class="btn-group btn-group-toggle" data-toggle="buttons" data-id="${user._id}">
                                    <label class="btn btn-outline-success ${approve}">
                                        <input type="radio" name="actions" id="action1" autocomplete="off" checked> Approve
                                    </label>
                                    <label class="btn btn-outline-danger ${reject}">
                                        <input type="radio" name="actions" id="action2" autocomplete="off"> Reject
                                    </label>
                                    <label class="btn btn-outline-secondary ${block}">
                                        <input type="radio" name="actions" id="action3" autocomplete="off"> Block
                                    </label>
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td colspan="4">
                                <h6>additional data</h6>
                                Lorem ipsum dolor sit amet, his aeque nonumy fabulas te, te vix integre nostrum deseruisse, vim id populo aeterno maiorum.
                            </td>
                        </tr>
                    `;
                });

                if(!tableContent) {
                    tableContent = `
                        <tr>
                            <td colspan="5">
                                <div class="waiting text-center py-5">
                                    <img src="./assets/no-data.svg" alt="placeholder image">
                                </div>
                                <h5 class="text-center">No data...</h5>
                            </td>
                        </tr>
                    `;
                }
                $('#nav-approved table tbody').html(tableContent);
                break;
            case 'rejected':
                res.users.forEach((user, idx) => {
                    console.log(user);
                    let approve = (user.status == 'approved') ? 'active' : '';
                    let reject = (user.status == 'rejected') ? 'active' : '';
                    let block = (user.status == 'blocked') ? 'active' : '';
                    tableContent += `
                        <tr>
                            <td class="font-weight-bold">${user.first_name} ${user.last_name}</td>
                            <td>${user.email}</td>
                            <td>${user.phone}</td>
                            <td>${user.registration}</td>
                            <td>
                                <div class="btn-group btn-group-toggle" data-toggle="buttons" data-id="${user._id}">
                                    <label class="btn btn-outline-success ${approve}">
                                        <input type="radio" name="actions" id="action1" autocomplete="off" checked> Approve
                                    </label>
                                    <label class="btn btn-outline-danger ${reject}">
                                        <input type="radio" name="actions" id="action2" autocomplete="off"> Reject
                                    </label>
                                    <label class="btn btn-outline-secondary ${block}">
                                        <input type="radio" name="actions" id="action3" autocomplete="off"> Block
                                    </label>
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td colspan="4">
                                <h6>additional data</h6>
                                Lorem ipsum dolor sit amet, his aeque nonumy fabulas te, te vix integre nostrum deseruisse, vim id populo aeterno maiorum.
                            </td>
                        </tr>
                    `;
                });

                if(!tableContent) {
                    tableContent = `
                        <tr>
                            <td colspan="5">
                                <div class="waiting text-center py-5">
                                    <img src="./assets/no-data.svg" alt="placeholder image">
                                </div>
                                <h5 class="text-center">No data...</h5>
                            </td>
                        </tr>
                    `;
                }
                $('#nav-rejected table tbody').html(tableContent);
                break;
            case 'blocked':
                res.users.forEach((user, idx) => {
                    console.log(user);
                    let approve = (user.status == 'approved') ? 'active' : '';
                    let reject = (user.status == 'rejected') ? 'active' : '';
                    let block = (user.status == 'blocked') ? 'active' : '';
                    tableContent += `
                        <tr>
                            <td class="font-weight-bold">${user.first_name} ${user.last_name}</td>
                            <td>${user.email}</td>
                            <td>${user.phone}</td>
                            <td>${user.registration}</td>
                            <td>
                                <div class="btn-group btn-group-toggle" data-toggle="buttons" data-id="${user._id}">
                                    <label class="btn btn-outline-success ${approve}">
                                        <input type="radio" name="actions" id="action1" autocomplete="off" checked> Approve
                                    </label>
                                    <label class="btn btn-outline-danger ${reject}">
                                        <input type="radio" name="actions" id="action2" autocomplete="off"> Reject
                                    </label>
                                    <label class="btn btn-outline-secondary ${block}">
                                        <input type="radio" name="actions" id="action3" autocomplete="off"> Block
                                    </label>
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td colspan="4">
                                <h6>additional data</h6>
                                Lorem ipsum dolor sit amet, his aeque nonumy fabulas te, te vix integre nostrum deseruisse, vim id populo aeterno maiorum.
                            </td>
                        </tr>
                    `;
                });

                if(!tableContent) {
                    tableContent = `
                        <tr>
                            <td colspan="5">
                                <div class="waiting text-center py-5">
                                    <img src="./assets/no-data.svg" alt="placeholder image">
                                </div>
                                <h5 class="text-center">No data...</h5>
                            </td>
                        </tr>
                    `;
                }
                $('#nav-blocked table tbody').html(tableContent);
                break;
        }
        
    });
}

function checkInput(elm) {
    if(elm.value == "") {
        $(elm).addClass('is-invalid');
        return false;
    } else {
        $(elm).removeClass('is-invalid');
        return true;
    }
}

function logout() {
    localStorage.removeItem('token');
}

function getToken() {
    return localStorage.getItem("token");
}

function redirectToLogin() {
    window.location.replace(`${window.location.origin}/suitetreatadmin/goingin.php`);
}