document.addEventListener('DOMContentLoaded', function() {

  document.querySelector('#sidebar-header').addEventListener('click', function(view) {
    if (!view.target.classList.contains('view_link')) {
      document.querySelector('#sidebar').classList.toggle('active');
    }
  });

  document.querySelector('#sidebarCollapse').addEventListener('click', function() {
    document.querySelector('#sidebar').classList.toggle('active');
  });
  
  // Use buttons to toggle between views
  document.querySelector('#inbox').addEventListener('click', () => load_mailbox('inbox'));
  document.querySelector('#sent').addEventListener('click', () => load_mailbox('sent'));
  document.querySelector('#archived').addEventListener('click', () => load_mailbox('archive'));
  document.querySelector('#compose').addEventListener('click', () => compose_email());

  // By default, load the inbox
  load_mailbox('inbox');


});

function compose_email(recipient_default = "", subject_default = "", body_default = "") {

  // Show compose view and hide other views
  document.querySelector('#emails-view').style.display = 'none';
  document.querySelector('#compose-view').style.display = 'block';
  document.querySelector('#email').style.display = 'none';
  document.querySelector('#error_message').style.display = 'none';

  // Clear out composition fields
  document.querySelector('#compose-recipients').value = recipient_default;
  document.querySelector('#compose-subject').value = subject_default;
  document.querySelector('#compose-body').value = body_default;

  document.querySelector('#compose-form').addEventListener('submit', (event) => {
    event.preventDefault();
    fetch('api/emails', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-CSRFToken': csrftoken
      },
      body: JSON.stringify({
          recipients: document.querySelector('#compose-recipients').value,
          subject:  document.querySelector('#compose-subject').value,
          body: document.querySelector('#compose-body').value
      })
    })
    .then(response => {
      if (response.ok) {
        response.json()
        .then(result => {
        // Print result
        console.log(result);
        })
        setTimeout(function(){ load_mailbox('sent'); }, 200);
      } else {
        document.querySelector('#error_message').innerHTML = 'Invalid Email Recipient/s';
        document.querySelector('#error_message').style.display = 'block';
        throw new Error("Invalid Email Recipient/s", {cause: response});
      }    
    });
  });
}

function load_mailbox(mailbox) {
  
  // Show the mailbox and hide other views
  document.querySelector('#emails-view').style.display = 'block';
  document.querySelector('#compose-view').style.display = 'none';
  document.querySelector('#email').style.display = 'none';
  document.querySelector('#error_message').style.display = 'none';

  // Show the mailbox name
  document.querySelector('#emails-view').innerHTML = `<h3>${mailbox.charAt(0).toUpperCase() + mailbox.slice(1)}</h3>`;

  fetch(`api/emails/${mailbox}`)
  .then(response => response.json())
  .then(emails => {
      // Print emails
      console.log(emails);
      var mail = mailbox
      emails.forEach(email => {
        const element = document.createElement('div');
        element.className = "email"
        let emailadd = document.createElement('p');
        emailadd.className = "sender_list"
        if (email.read == false) {
          element.className += " read";
        } else {
          element.className += " unread";
        }
        emailadd.innerHTML = email.sender;
        let subj = document.createElement('p');
        subj.className = "subject_list"
        subj.innerHTML = email.subject;
        let time = document.createElement('p');
        if (mail === "sent") {
          time.className = "sent_time_list";
        } else {
          time.className = "time_list";
        }
        time.innerHTML = email.timestamp;
        let archive_div = document.createElement('div');
        archive_div.className = "archive_div";
        let archive_button = document.createElement('button');
        archive_button.className = "btn btn-sm btn-outline-secondary py-0 archive_button";
        archive_div.appendChild(archive_button);
        if (email.archived == true) {
          archive_button.innerHTML = "Unarchive";
        } else {
          archive_button.innerHTML = "Archive";
        }
        archive_button.addEventListener('click', () => {
          archive_email(email.id, email.archived)
          element.style.display = 'none'
        });
        element.appendChild(emailadd);
        element.appendChild(subj);
        element.appendChild(time);
        if (mail == "inbox" || mail == "archive") {
          element.appendChild(archive_div);
        }
        element.addEventListener('click', function(view) {
          if (!view.target.classList.contains('archive_button')) {
            view_email(email.id)
          }
        });
        document.querySelector('#emails-view').append(element);
      });
  });
}

function view_email(email_id) {
  // Show the mailbox and hide other views
  document.querySelector('#emails-view').style.display = 'none';
  document.querySelector('#compose-view').style.display = 'none';
  document.querySelector('#email').style.display = 'block';
  document.querySelector('#error_message').style.display = 'none';

  fetch(`api/emails/${email_id}`, {
    method: 'PUT',
    headers: {
      'X-CSRFToken': csrftoken
    },
    body: JSON.stringify({
        read: true
    })
  })

  fetch(`api/emails/${email_id}`)
  .then(response => response.json())
  .then(email => {
      // Print email
    console.log(email);
    
    let receivers = email.recipients.join(",");
    document.querySelector('#email_subject').innerHTML = `Subject: ${email.subject}`;
    document.querySelector('#email_sender').innerHTML = `<strong>From</strong>: ${email.sender}`;
    document.querySelector('#email_receiver').innerHTML = `<strong>To</strong>: ${receivers}`;
    document.querySelector('#email_timestamp').innerHTML = email.timestamp;
    document.querySelector('#email_body').innerHTML = email.body;

    let re_subject = "";
    if (!email.subject.startsWith("Re: ")) {
      re_subject = `Re: ${email.subject}`;
    } else {
      re_subject = email.subject;
    }
    let re_body = `On ${email.timestamp} ${email.sender} wrote: ${email.body}`;

    document.querySelector('#reply').addEventListener('click', () => compose_email(email.sender, re_subject, re_body));
  });
}

function archive_email(email_id, email_archived) {
  if (email_archived == true) {
    fetch(`api/emails/${email_id}`, { 
      method: 'PUT',
      headers: {
        'X-CSRFToken': csrftoken
      },
      body: JSON.stringify({
          archived: false
      })
    })

  } else {
    fetch(`api/emails/${email_id}`, {
      method: 'PUT',
      headers: {
        'X-CSRFToken': csrftoken
      },
      body: JSON.stringify({
          archived: true
      })
    })
  }
}
