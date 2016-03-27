#WIP

This is just a quick draft of eventsourcing for meteor. I kind of like the api I've got, but it needs a lot of work.

An important note: currently you can't actually take much advantage of the 'event sourced' aspect, because all we're really doing is storing the events along side the updated documents, and we don't have any safety checks built in. But that will change soon (I hope).