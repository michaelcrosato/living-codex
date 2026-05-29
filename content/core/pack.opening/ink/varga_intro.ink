VAR met_varga = false
VAR accepted = false
~ met_varga = true
Varga looks up from her drink. "You're the one the stranger sent. Good."
"There's an encrypted drive in the Syndicate warehouse. I need it. Getting in is your problem — talk, sneak, or kick the door. I don't care how."
* [I'll do it]
    ~ accepted = true
    "Then go. Don't come back empty-handed."
    -> END
* [What's in it for me?]
    "Credits. And me owing you one. In Ashfall, that's worth more than credits."
    ** [Fine, I'll do it]
        ~ accepted = true
        "Then go."
        -> END
    ** [Still not interested]
        "Then you're wasting my drink."
        -> END
* [Not interested]
    "Then you're no use to me."
    -> END
