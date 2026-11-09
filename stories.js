/* Storyborne stories: both kids' tracks, starter stories, phonics lessons and chapter books.
   Loaded before app.js; its top-level consts are shared with app.js. */
/* ============================================================
   SON'S TRACK — "Biscuit & the Pocket Pals"
   Original characters: Biscuit (an easygoing orange cat in a red cap)
   and his Pocket Pals: Zip (lightning bunny, she), Plip (water frog, he),
   Toasty (fire pup, he), Leafy (plant pal, she), Chip (chick, she).

   Level kinds:
     letters : items = [letter, emoji, keyword]
     words   : items = list of words (a random round is drawn each time)
     story   : stories = [{title, emoji, text, qs}]
               text  -> blank line = new page
               qs    -> [question, [options...], indexOfCorrect]
   ============================================================ */
const SON_TRACK = {
  key: 'son',
  trackName: 'Biscuit & the Pocket Pals',
  hero: 'Biscuit',
  mascot: '🐱',
  levels: [
    {
      n: 1, title: 'Letter Sounds', kind: 'letters', roundSize: 8, pass: 0.75,
      intro: 'Say the sound each letter makes!',
      items: [
        ['a','🍎','apple'],['b','🐻','bear'],['c','🐱','cat'],['d','🐶','dog'],
        ['e','🥚','egg'],['f','🐟','fish'],['g','🐐','goat'],['h','🎩','hat'],
        ['i','🦎','iguana'],['j','🧃','juice'],['k','🪁','kite'],['l','🦁','lion'],
        ['m','🌙','moon'],['n','🪺','nest'],['o','🐙','octopus'],['p','🐷','pig'],
        ['q','👑','queen'],['r','🌈','rainbow'],['s','☀️','sun'],['t','🐢','turtle'],
        ['u','☂️','umbrella'],['v','🎻','violin'],['w','🐋','whale'],['x','🦊','fox'],
        ['y','🪀','yo-yo'],['z','🦓','zebra']
      ]
    },
    {
      n: 2, title: 'Short Words', kind: 'words', roundSize: 10, pass: 0.8,
      intro: 'Sound it out: c - a - t!',
      items: ('cat hat bat sat mat rat map cap nap tap sun run fun bun hug bug ' +
              'rug mug cup pup dog log hop top pot hot pig big dig wig sit hit ' +
              'pin win fin bed red fed ten hen pen net jet wet yes box fox mop ' +
              'jam ham van can fan man dad mom kid lid zip web hum').split(' ')
    },
    {
      n: 3, title: 'Sight Words', kind: 'words', roundSize: 10, pass: 0.8,
      intro: 'These words show up everywhere!',
      items: ('the a and to is in it you said for up look we can see my ' +
              'go me like on at he she was are of they here come play blue ' +
              'red yellow one two three down funny help jump little make not ' +
              'run where with this have do').split(' ')
    },
    {
      n: 4, title: 'Sentences', kind: 'story',
      stories: [
        { title: 'Biscuit and the Big Hat', emoji: '🎩',
          text: `Biscuit is a cat.

Biscuit has a big red hat.

The hat is on his head.

Zip the bunny sees the hat.

Zip and Biscuit hop and hop.`,
          qs: [
            ['Who is Biscuit?', ['🐱 A cat', '🐶 A dog', '🐟 A fish'], 0],
            ['What color is the hat?', ['🔴 Red', '🔵 Blue', '🟢 Green'], 0],
            ['Who sees the hat?', ['🐰 Zip', '🐸 A frog', '🐷 A pig'], 0],
            ['How do you think Biscuit feels?', ['😊 Happy', '😢 Sad', '😠 Mad'], 0]
          ] },
        { title: 'Plip Gets Wet', emoji: '🐸',
          text: `Plip is a frog.

Plip can swim in the pond.

Biscuit sat on a log.

Plip got Biscuit wet!

Biscuit did not mind. He had fun.`,
          qs: [
            ['What is Plip?', ['🐸 A frog', '🐻 A bear', '🐔 A hen'], 0],
            ['Where can Plip swim?', ['💧 In the pond', '🛏️ In bed', '🚗 In a car'], 0],
            ['Where did Biscuit sit?', ['🪵 On a log', '🚌 On a bus', '🪑 On a chair'], 0],
            ['Did Biscuit have fun?', ['😄 Yes, he had fun', '😠 No, he was mad', '😴 He fell asleep'], 0]
          ] },
        { title: 'Toasty the Fire Pup', emoji: '🔥',
          text: `Toasty is a pup.

Toasty has a red tail.

His tail is hot, hot, hot!

Biscuit and Toasty sit by the tent.

Toasty helps keep them warm.`,
          qs: [
            ['What is Toasty?', ['🐶 A pup', '🐱 A cat', '🐢 A turtle'], 0],
            ['What color is his tail?', ['🔴 Red', '🟣 Purple', '⚪ White'], 0],
            ['Where do they sit?', ['⛺ By the tent', '🛁 In the tub', '🏫 At school'], 0],
            ['How does Toasty help?', ['🔥 He keeps them warm', '🎵 He sings', '⛏️ He digs'], 0]
          ] },
        { title: 'The Big Nap', emoji: '😴',
          text: `Biscuit is in the sun.

The sun is hot and the rug is soft.

Zip, Plip, and Toasty get on the rug.

They all nap in a big pile.

Biscuit is the last one up.`,
          qs: [
            ['Where is Biscuit?', ['☀️ In the sun', '🌧️ In the rain', '❄️ In the snow'], 0],
            ['What is soft?', ['🟫 The rug', '🪨 A rock', '🪵 A stick'], 0],
            ['What do they all do?', ['😴 Nap', '🏃 Run', '🏊 Swim'], 0],
            ['Who is the last one up?', ['🐱 Biscuit', '🐰 Zip', '🐸 Plip'], 0]
          ] }
      ]
    },
    {
      n: 5, title: 'Short Stories', kind: 'story',
      stories: [
        { title: 'Zip Is Fast', emoji: '⚡',
          text: `Zip the bunny can run very fast. Biscuit wants to race.

"Ready, set, go!" said Plip. Zip zoomed past the tree.

Biscuit did not win, but he did not care. "Let's race again!" he said.`,
          qs: [
            ['What can Zip do?', ['⚡ Run very fast', '🦅 Fly', '🎨 Paint'], 0],
            ['Who said "Ready, set, go"?', ['🐸 Plip', '🐶 Toasty', '🐱 Biscuit'], 0],
            ['Who won the race?', ['🐰 Zip', '🐱 Biscuit', '🐸 Plip'], 0],
            ['How did Biscuit feel about losing?', ['😎 He did not care', '😭 He cried', '😡 He was very mad'], 0]
          ] },
        { title: 'The Lost Ball', emoji: '⚽',
          text: `Biscuit had a red ball. He kicked it up, up, up.

The ball went into a bush. "Oh no!" said Biscuit.

Leafy the plant pal looked in the bush. She found the ball!

Biscuit said, "Thank you, Leafy!"`,
          qs: [
            ['What color was the ball?', ['🔴 Red', '🟡 Yellow', '🔵 Blue'], 0],
            ['Where did the ball go?', ['🌳 Into a bush', '🌊 Into the sea', '🏠 On the roof'], 0],
            ['Who found the ball?', ['🌿 Leafy', '🐰 Zip', '🐶 Toasty'], 0],
            ['What did Biscuit say?', ['🙏 Thank you!', '👋 Goodbye!', '😴 Good night!'], 0]
          ] },
        { title: 'Rainy Day', emoji: '🌧️',
          text: `It is raining, so Biscuit stays in. He is a little sad.

Plip loves the rain! He jumps in every puddle.

Biscuit puts on his boots and goes out too. Now the rain is fun!`,
          qs: [
            ['Why does Biscuit stay in?', ['🌧️ It is raining', '🌙 It is night', '🤒 He is sick'], 0],
            ['Who loves the rain?', ['🐸 Plip', '🐶 Toasty', '🐔 Chip'], 0],
            ['What does Biscuit put on?', ['🥾 Boots', '🎩 A hat', '🧤 Mittens'], 0],
            ['How does Biscuit feel at the end?', ['😄 Happy', '😢 Sad', '😨 Scared'], 0]
          ] },
        { title: "Toasty's Snack", emoji: '🍞',
          text: `Toasty is hungry. He wants a hot snack.

Biscuit makes toast. Toasty puffs on it to make it warm.

Oops! The toast is too hot and black. They both laugh and make more.`,
          qs: [
            ['What does Toasty want?', ['🍞 A hot snack', '🧊 Ice', '🛁 A bath'], 0],
            ['What does Biscuit make?', ['🍞 Toast', '🍰 Cake', '🍝 Noodles'], 0],
            ['What happened to the toast?', ['⬛ It got black', '💧 It got wet', '🌈 It got pink'], 0],
            ['What did they do next?', ['😂 Laughed and made more', '😠 Got mad', '🏃 Ran away'], 0]
          ] }
      ]
    },
    {
      n: 6, title: 'Bigger Stories', kind: 'story',
      stories: [
        { title: 'The Shell at the Beach', emoji: '🐚',
          text: `Biscuit and Plip went to the beach. The sand was hot.

Plip found a shell. It was pink and shiny.

"Shh," said Biscuit. "Can you hear the sea in the shell?"

Plip held the shell up to his ear. "I hear a splash!" he said.

Then they put the shell back, so a crab could have a home.`,
          qs: [
            ['Where did they go?', ['🏖️ The beach', '🏔️ The hills', '🏪 The shop'], 0],
            ['What did Plip find?', ['🐚 A shell', '🪙 A coin', '🦀 A crab'], 0],
            ['What color was the shell?', ['🩷 Pink', '⬛ Black', '🟩 Green'], 0],
            ['Why did they put the shell back?', ['🦀 So a crab could have a home', '🗑️ It was dirty', '😴 They were tired'], 0]
          ] },
        { title: 'Chip the Chick', emoji: '🐥',
          text: `A little chick named Chip was stuck on a branch. "Cheep! Cheep!" she cried.

Zip could not jump that high. Toasty could not climb.

Then Biscuit had a plan. He stood on a stump and stretched up.

Chip hopped onto his hat. Then she slid down to the grass.

"Thanks!" chirped Chip. Now she is the newest Pocket Pal.`,
          qs: [
            ['Where was Chip stuck?', ['🌳 On a branch', '🕳️ In a hole', '🏠 On a roof'], 0],
            ['Who had a plan?', ['🐱 Biscuit', '🐰 Zip', '🐶 Toasty'], 0],
            ['What did Biscuit stand on?', ['🪵 A stump', '🪜 A ladder', '🛹 A skateboard'], 0],
            ['What is Chip now?', ['⭐ The newest Pocket Pal', '🦅 A big eagle', '🐟 A fish'], 0]
          ] },
        { title: 'The Big Storm', emoji: '⛈️',
          text: `Flash! Crash! A big storm came to the park.

Zip was not scared. She is a lightning pal, after all.

But Plip and Leafy were scared, so they hid under a bench.

Biscuit got a soft blanket, and they all snuggled up.

When the storm stopped, they saw a rainbow stretch across the sky.`,
          qs: [
            ['What came to the park?', ['⛈️ A big storm', '🎪 A circus', '🚒 A fire truck'], 0],
            ['Who was NOT scared?', ['🐰 Zip', '🐸 Plip', '🌿 Leafy'], 0],
            ['Where did Plip and Leafy hide?', ['🪑 Under a bench', '🌳 In a tree', '🚗 In a car'], 0],
            ['What did they see at the end?', ['🌈 A rainbow', '🌙 The moon', '🎈 A balloon'], 0]
          ] },
        { title: 'Brush, Brush, Brush', emoji: '🪥',
          text: `Every night, Biscuit brushes his teeth. Brush, brush, brush!

Toasty does not want to brush. "My teeth are fine," he says.

Biscuit shows him a trick. They sing a song while they brush.

Toasty grins. His teeth shine bright and white.

"That was the best brush ever!" he says.`,
          qs: [
            ['What does Biscuit do every night?', ['🪥 Brushes his teeth', '🍪 Eats cookies', '📺 Watches TV'], 0],
            ['Who did not want to brush?', ['🐶 Toasty', '🐸 Plip', '🐰 Zip'], 0],
            ['What trick did Biscuit show?', ['🎵 Sing a song', '🤸 Do a flip', '🙈 Shut your eyes'], 0],
            ['How did Toasty feel at the end?', ['😁 Happy', '😢 Sad', '😠 Grumpy'], 0]
          ] }
      ]
    }
  ],
  rewards: [
    ['⚡','Zappy'],['💧','Drizzle'],['🔥','Ember Pup'],['🌿','Sprout'],['🪨','Rocky'],
    ['❄️','Frosty'],['🌙','Moonbeam'],['☀️','Sunny'],['🌪️','Whirl'],['🍄','Mushy'],
    ['🦋','Flutter'],['🐞','Dotty'],['🌸','Petal'],['⭐','Twinkle'],['🫧','Bubbles'],
    ['🍀','Lucky'],['🌋','Lava Lou'],['🎈','Floaty'],['🐚','Shelly'],['🌊','Wavey'],
    ['🍩','Sprinkles'],['🎵','Melody'],['🧲','Magnet'],['🌵','Prickles'],['🪐','Orbit']
  ]
};

/* ============================================================
   MILES — "Detective Biscuit" mystery series (original).
   Biscuit puts on his detective hat, looks for clues, and thinks.
   Adds mysteries to Levels 4–6 and two new top levels (7–8)
   that climb toward early-chapter mystery books (~grade 2).
   ============================================================ */
const SON_DETECTIVE = {
  4: [
    { title: 'Where Is the Cap?', emoji: '🧢',
      text: `Biscuit's red cap is gone!

"I will find it," said Biscuit. "I am a detective."

Is it in the bed? No.

Is it in the tub? No.

He sees a red tip under the rug.

It is the cap! Zip sat on it in her nap.`,
      qs: [
        ['What is gone?', ['🧢 The red cap', '⚽ A ball', '🍞 The toast'], 0],
        ['Where did Biscuit look first?', ['🛏️ In the bed', '🌳 In a tree', '🚗 In a car'], 0],
        ['What clue did he see?', ['🔴 A red tip under the rug', '👣 Big steps', '🪶 A feather'], 0],
        ['Who sat on the cap?', ['🐰 Zip', '🐸 Plip', '🐶 Toasty'], 0]
      ] },
    { title: 'The Missing Snack', emoji: '🐟',
      text: `Biscuit had a fish snack.

He set it on a box.

Then the snack was gone!

Biscuit saw wet steps on the mat.

The wet steps went to the pond.

Plip had the snack! "Yum," said Plip.`,
      qs: [
        ['What snack did Biscuit have?', ['🐟 A fish snack', '🍎 An apple', '🍪 A cookie'], 0],
        ['Where did he set it?', ['📦 On a box', '🛏️ On the bed', '🪑 On a chair'], 0],
        ['What clue did Biscuit find?', ['💧 Wet steps', '🔥 Smoke', '🌿 A leaf'], 0],
        ['Who had the snack?', ['🐸 Plip', '🐰 Zip', '🐥 Chip'], 0]
      ] }
  ],
  5: [
    { title: 'The Case of the Loud Bump', emoji: '🌙',
      text: `At night, Biscuit heard a loud BUMP. He put on his detective hat.

He went to the kitchen. A pot was on the floor, and it was still warm.

Warm pot? Biscuit thought of Toasty. But Toasty was in bed, snoring.

Then Biscuit saw a long ear by the shelf. It was Zip! "Sorry," she said. "I wanted a snack."`,
      qs: [
        ['What did Biscuit hear?', ['💥 A loud bump', '🎵 A song', '🐦 A bird'], 0],
        ['What was on the floor?', ['🍲 A warm pot', '📚 A book', '🧦 A sock'], 0],
        ['Why did Biscuit think of Toasty first?', ['🔥 The pot was warm', '🐾 He saw paw prints', '😴 Toasty was snoring'], 0],
        ['Who made the bump?', ['🐰 Zip', '🐶 Toasty', '🐸 Plip'], 0]
      ] },
    { title: 'Who Ate the Flowers?', emoji: '🌷',
      text: `Leafy had six red flowers. In the morning, three were gone!

"Detective Biscuit, can you help?" Leafy asked.

Biscuit looked at the dirt. He saw bunny tracks. "Tracks like these mean a bunny," he said.

Zip's face turned pink. "They were so yummy," she said. Then Zip helped Leafy plant new ones.`,
      qs: [
        ['How many flowers were gone?', ['3️⃣ Three', '1️⃣ One', '6️⃣ Six'], 0],
        ['Who asked Biscuit for help?', ['🌿 Leafy', '🐥 Chip', '🐶 Toasty'], 0],
        ['What clue was in the dirt?', ['🐰 Bunny tracks', '💧 A puddle', '🪶 A feather'], 0],
        ['How did Zip fix it?', ['🌱 She planted new flowers', '🏃 She ran away', '😴 She took a nap'], 0]
      ] }
  ],
  6: [
    { title: 'The Case of the Shiny Coin', emoji: '🪙',
      text: `Chip found a shiny coin. She put it on the windowsill so it would sparkle in the sun.

The next morning, the coin was gone! "Who took it?" Chip cried.

Detective Biscuit looked closely. The window was open. On the sill was a black feather.

"Plip has no feathers. Toasty has no feathers," said Biscuit. "But a crow does. And crows love shiny things."

They looked up in the tree. In a crow's nest was the coin, plus a key, a spoon, and a button!

Biscuit traded the crow a shiny bottle cap. The crow liked it even more.`,
      qs: [
        ['Where did Chip put the coin?', ['🪟 On the windowsill', '🛏️ Under the bed', '📦 In a box'], 0],
        ['What clue did Biscuit find?', ['🪶 A black feather', '👣 Wet steps', '🥕 A carrot'], 0],
        ['Why did Biscuit think it was a crow?', ['✨ Crows love shiny things and have feathers', '🎵 Crows sing', '🐸 Crows like ponds'], 0],
        ['How did Biscuit get the coin back?', ['🔁 He traded a bottle cap', '🧗 He climbed and grabbed it', '😠 He yelled at the crow'], 0]
      ] },
    { title: 'Two Snowman Mysteries', emoji: '⛄',
      text: `The Pocket Pals built a tall snowman with a carrot nose.

The next day, the snowman was much shorter, and the carrot nose was gone!

"Two mysteries," said Detective Biscuit. "Let's find two answers."

First, he looked at the sky. The sun was shining. There was a puddle around the snowman. "The sun melted him," Biscuit said. "That's why he is short."

Then he looked at the snow. He saw hoof prints leading to the woods. At the end of the tracks, a deer was munching the carrot!

"Case closed," said Biscuit. "Both cases!"`,
      qs: [
        ['What two things were wrong with the snowman?', ['📉 It was shorter and the nose was gone', '🎩 Its hat was red', '❄️ It had two noses'], 0],
        ['Why did the snowman get shorter?', ['☀️ The sun melted it', '🐰 Zip ate it', '💨 The wind blew it'], 0],
        ['What clue led to the nose?', ['🦌 Hoof prints', '🪶 A feather', '🔴 A red tip'], 0],
        ['Who had the carrot?', ['🦌 A deer', '🐰 Zip', '🐶 Toasty'], 0]
      ] }
  ],
  7: [
    { title: 'The Case of the Silent Bell', emoji: '🔔',
      text: `Biscuit loved the bell on his bike. Ring, ring! But one morning, the bell made no sound at all. It just went "clunk."

Biscuit put on his detective hat and got his magnifying glass. He looked inside the bell. It was full of thin, sticky threads.

"Threads like these come from a spider," he said. "A spider made a web in my bell!"

Sure enough, a tiny brown spider peeked out. She looked very cozy.

Biscuit did not want to hurt her. He held a flowerpot next to the bell, and the spider walked right in.

Now the spider has a new home, and Biscuit's bell rings again. Ring, ring!`,
      qs: [
        ['What was wrong with the bell?', ['🔕 It did not ring', '💥 It was too loud', '🔵 It turned blue'], 0],
        ['What tool did Biscuit use?', ['🔍 A magnifying glass', '🔨 A hammer', '🪜 A ladder'], 0],
        ['What clue did he find inside the bell?', ['🕸️ Sticky threads', '💧 Water', '🪶 A feather'], 0],
        ['How did Biscuit help the spider?', ['🪴 He gave her a flowerpot home', '🧹 He swept her away', '🚲 He rode fast'], 0],
        ['What does this show about Biscuit?', ['💛 He is kind and smart', '😠 He is grumpy', '😴 He is lazy'], 0]
      ] },
    { title: 'The Case of the Backward Footprints', emoji: '🐾',
      text: `It had rained all morning. Biscuit saw muddy paw prints on the porch. They went into the house, but no prints came back out.

"Someone is still inside," said Chip, hiding behind Biscuit.

Biscuit looked closer. In front of each paw print was a long, thin line in the mud. "That line was made by a tail," he said. "But a tail drags behind you, not in front of you."

He thought hard. Then he smiled. "These prints were made by someone walking backward! They are not going in. They are going out."

Just then, Toasty peeked over the fence, giggling. "I wanted to trick a detective," he said.

"Nice try," said Biscuit. "But the tail tells the tale."`,
      qs: [
        ['Where did Biscuit see the muddy prints?', ['🏠 On the porch', '🏖️ At the beach', '🚌 On the bus'], 0],
        ['Why was Chip scared?', ['😨 She thought someone was still inside', '⛈️ It was raining', '🐶 Toasty barked'], 0],
        ['What was the important clue?', ['〰️ A tail line in front of the prints', '🪶 A feather', '💧 A puddle'], 0],
        ['What did Biscuit figure out?', ['🔙 Someone walked out backward', '🏠 Someone was in the house', '🐸 Plip made the prints'], 0],
        ['Who played the trick?', ['🐶 Toasty', '🐰 Zip', '🌿 Leafy'], 0]
      ] },
    { title: 'The Case of the Missing Present', emoji: '🎁',
      text: `It was Chip's birthday. Biscuit had wrapped a present for her and hidden it under his bed.

But when he looked, the present was gone! All he found was a trail of sparkly glitter on the floor.

Detective Biscuit followed the glitter. It went down the hall, out the door, and across the yard. It led all the way to Leafy's garden shed.

Biscuit opened the door slowly. "SURPRISE!" shouted all of his friends. The shed was full of balloons, streamers, and a big cake.

"We moved your present here for the party," said Zip. "We used glitter on the decorations, and some fell off."

"So the clue was an accident," Biscuit laughed. "This is the best case ever."`,
      qs: [
        ['Whose birthday was it?', ['🐥 Chip\'s', '🐱 Biscuit\'s', '🐸 Plip\'s'], 0],
        ['Where did Biscuit hide the present?', ['🛏️ Under his bed', '🌳 In a tree', '📦 In the shed'], 0],
        ['What clue did Biscuit follow?', ['✨ A glitter trail', '👣 Muddy prints', '🪶 Feathers'], 0],
        ['Where did the trail lead?', ['🏚️ Leafy\'s garden shed', '🏖️ The beach', '🏫 The school'], 0],
        ['Why was there glitter on the floor?', ['🎉 It fell off the party decorations', '🐦 A bird dropped it', '🌧️ The rain brought it'], 0]
      ] }
  ],
  8: [
    { title: 'The Case of the Midnight Music', emoji: '🎶',
      text: `Every night that week, Biscuit heard strange music. Hoooo. Wheeee. Hoooo. It sounded like a ghost singing a song.

Zip hid under her blanket. Chip would not go outside after dark. "It's a ghost!" said Plip.

"Detectives don't believe in ghosts," said Biscuit. "They believe in clues."

So Biscuit made a list of facts. Fact one: the music only played at night. Fact two: it was loudest on windy nights. Fact three: on the one night with no wind, there was no music at all.

"The wind is part of this mystery," Biscuit said.

He took his flashlight and followed the sound to the back fence. There, in a long row, were six empty glass bottles. Plip had lined them up there after a picnic.

When the wind blew across the tops of the bottles, they sang. Hoooo. Wheeee.

"The ghost is just bottles and wind," Biscuit said. He blew across the top of one himself to show everyone. Hoooo!

Zip came out from under her blanket and laughed. Then the Pocket Pals had a better idea. They filled each bottle with a different amount of water and made a real band.

Now the fence plays music on purpose, and nobody is scared.`,
      qs: [
        ['What did the strange music sound like?', ['👻 A ghost singing', '🐶 A dog barking', '🚂 A train'], 0],
        ['What do detectives believe in, according to Biscuit?', ['🔍 Clues', '👻 Ghosts', '🍀 Luck'], 0],
        ['Which fact was the biggest clue?', ['💨 No wind meant no music', '🌙 The moon was full', '🐸 Plip was sleepy'], 0],
        ['What was really making the music?', ['🍾 Wind blowing across bottles', '🐦 Birds', '📻 A radio'], 0],
        ['How did the story end?', ['🎵 They made a bottle band', '🏃 They moved away', '😨 They stayed scared'], 0]
      ] },
    { title: 'The Case of the Lucky Rock', emoji: '🪨',
      text: `Toasty had a lucky rock. It was smooth and red, with a white stripe like a lightning bolt. He carried it everywhere.

One afternoon, Toasty ran to Biscuit's house. His tail was drooping. "I lost my lucky rock at the park!" he cried. "I've looked everywhere."

Biscuit put on his detective hat. "Let's go back and walk the same path you walked," he said. "That's called retracing your steps."

At the park, Toasty showed him the swings, the slide, and the bench where he ate lunch. No rock.

Then Biscuit noticed something. Toasty's paws were covered with sand. "Toasty, did you go to the sandbox?"

"Oh, yes," said Toasty. "I built a giant sand castle. I forgot about that."

They raced to the sandbox. The castle was still there, with a tall tower on top. Biscuit looked carefully at the tower. Near the top was a tiny red window with a white stripe.

"There's your lucky rock," said Biscuit. "You used it as a window."

Toasty gently pulled it out and hugged it. "You're the best detective ever."

"I just followed the sand," said Biscuit. "Clues are everywhere, if you look."`,
      qs: [
        ['What did Toasty\'s lucky rock look like?', ['🔴 Red with a white stripe', '🔵 Blue and round', '⚫ Black and sharp'], 0],
        ['What does "retracing your steps" mean?', ['🔁 Going back the way you went', '🏃 Running fast', '🦶 Washing your feet'], 0],
        ['What clue did Biscuit notice?', ['🏖️ Sand on Toasty\'s paws', '💧 A puddle', '🪶 A feather'], 0],
        ['Where was the rock?', ['🏰 In the sand castle tower', '🪑 Under the bench', '🛝 On the slide'], 0],
        ['What lesson does Biscuit share?', ['🔍 Clues are everywhere if you look', '🍀 Rocks bring luck', '🏖️ Never play in sand'], 0]
      ] },
    { title: 'The Case of the Painted Fence', emoji: '🎨',
      text: `Leafy painted a beautiful picture on the backyard fence. It had a yellow sun, green hills, and a big rainbow. Everyone loved it.

The next morning, there were blue smudges all over the rainbow! Leafy was very upset. "Who would ruin my painting?" she asked.

Detective Biscuit studied the smudges with his magnifying glass. They were small, round marks, and each one had four tiny lines.

"These are not brush marks," he said. "These are prints. Small paw prints, with four toes."

He checked his friends. Zip's paws were clean. Toasty's paws were clean. Plip had webbed feet, which would leave a different shape.

Then Biscuit looked down at the grass. Next to the fence was a tipped-over cup of blue paint. Little blue prints led away from it, up the tree, and onto a branch.

On the branch sat a squirrel with bright blue feet.

"The squirrel stepped in the paint," said Biscuit. "Then it ran across the fence to get to the tree. It wasn't trying to ruin anything. It was an accident."

Leafy looked at the squirrel and couldn't stay mad. Then she had an idea. She turned every blue paw print into a tiny blue flower.

"Now my painting is even better," she said. And the squirrel seemed to agree.`,
      qs: [
        ['What was on the painted fence?', ['🌈 A sun, hills, and a rainbow', '🐱 A cat', '🏠 A house'], 0],
        ['What did Biscuit notice about the smudges?', ['🐾 They were paw prints with four toes', '🖌️ They were brush lines', '💧 They were raindrops'], 0],
        ['Why wasn\'t it Plip?', ['🐸 His webbed feet make a different shape', '😴 He was asleep', '🏊 He was swimming'], 0],
        ['Who made the marks?', ['🐿️ A squirrel', '🐰 Zip', '🐶 Toasty'], 0],
        ['How did Leafy fix the painting?', ['🌸 She turned the prints into flowers', '🧽 She scrubbed it off', '🎨 She painted it all blue'], 0]
      ] }
  ]
};

// Wire mysteries into the track: tag series, extend levels 7–8.
SON_TRACK.series = { pals: { name: 'Biscuit & Pals', emoji: '🐱' }, detective: { name: 'Detective Biscuit', emoji: '🔍' } };
SON_TRACK.levels.forEach(L => { if (L.kind === 'story') L.stories.forEach(s => { s.series = s.series || 'pals'; }); });
SON_TRACK.levels.push(
  { n: 7, title: 'Chapter Mysteries', kind: 'story', stories: [] },
  { n: 8, title: 'Super Sleuth', kind: 'story', stories: [] }
);
for (const [n, list] of Object.entries(SON_DETECTIVE)) {
  list.forEach(s => s.series = 'detective');
  SON_TRACK.levels[n - 1].stories.push(...list);
}

// Legendary Pocket Pals: [emoji, name, type, level they unlock at]
SON_TRACK.rewards.push(
  ['🤖','Gizmo Bot',null,4], ['🐉','Sky Serpent',null,5], ['🦄','Glimmerhorn',null,6],
  ['🥷','Shadow Pup',null,7], ['👑','King Fluff',null,8]
);

/* ============================================================
   MILES — "Read with Biscuit" starter stories for Levels 1–3,
   so every level has a real story next to the letter/word drill.
   Emoji on a page are picture clues: shown, never scored.
   ============================================================ */
const SON_STARTER = {
  1: [
    { title: 'What Biscuit Sees', emoji: '👀',
      text: `I see a cat. 🐱 The cat is on a mat.

I see a dog. 🐶 The dog can sit.

I see a pig. 🐷 The pig is in the mud.

I look up. I see a sun. ☀️ The sun is hot.

I look down. I see a bug! 🐞 The bug is red. Hi, bug!`,
      qs: [
        ['What did Biscuit see first?', ['🐱 A cat', '🐟 A fish', '🚗 A car'], 0],
        ['What did he see in the sky?', ['☀️ The sun', '🌙 The moon', '🎈 A balloon'], 0],
        ['What did he see last?', ['🐞 A bug', '🐷 A pig', '🐶 A dog'], 0]
      ] },
    { title: 'I Like My Things', emoji: '❤️',
      text: `I like my hat. 🎩 It is red.

I like my dog. 🐶 My dog can run.

I like my bed. 🛏️ I nap in my bed.

I like my cup. 🥤 It is big.

I like my things a lot. But I like my mom the most! ❤️`,
      qs: [
        ['What does he like to wear?', ['🎩 A hat', '🧤 Mittens', '👟 Shoes'], 0],
        ['Where does he sleep?', ['🛏️ In his bed', '🌳 In a tree', '🛁 In the tub'], 0],
        ['Who does he like at the end?', ['❤️ His mom', '🐷 A pig', '🐞 A bug'], 0]
      ] },
    { title: 'Look at Me!', emoji: '🙌',
      text: `Look at the fox. 🦊 The fox can run.

Look at the hen. 🐔 The hen can sit on an egg.

Look at the frog. 🐸 The frog can hop.

Look at the bus. 🚌 We can get on the bus.

Can you see me? I can run, sit, and hop. Look at me! 😺`,
      qs: [
        ['Which animal says "cluck"?', ['🐔 The hen', '🦊 The fox', '🐸 The frog'], 0],
        ['What can you ride in?', ['🚌 The bus', '🐸 The frog', '🦊 The fox'], 0],
        ['Who is "me" at the end?', ['😺 Biscuit', '🐔 The hen', '🚌 The bus'], 0]
      ] }
  ],
  2: [
    { title: 'The Big Pig', emoji: '🐷',
      text: `A pig is big. 🐷 The pig has a pink nose.

The big pig is in the mud. The mud is wet.

The pig can dig and dig. Dig, pig, dig!

Biscuit can not dig. 🐱 He sat on a log in the sun.

The pig got mud on his back. He got mud on his legs. The pig is a big mess! 😂`,
      qs: [
        ['Where is the pig?', ['🟫 In the mud', '🛁 In the tub', '🌳 In a tree'], 0],
        ['What can the pig do?', ['⛏️ Dig', '🦅 Fly', '🏊 Swim'], 0],
        ['How does the pig look at the end?', ['😂 Like a big mess', '✨ Very clean', '😴 Asleep'], 0]
      ] },
    { title: 'Zip and the Jet', emoji: '🚀',
      text: `Zip has a red jet. 🐰 It is not big.

Zip sat in the jet. She had a hat on.

The jet can zip up, up, up! 🚀 It went up to the top.

Zip sees the sun. ☀️ Zip sees a hill and a pond. The pond is not big from up here!

The jet came down. It did a bump on the grass. Zip got out. The jet is fun!`,
      qs: [
        ['What color is the jet?', ['🔴 Red', '🔵 Blue', '🟢 Green'], 0],
        ['Which way did the jet go?', ['⬆️ Up, up, up', '⬇️ Down', '↩️ Back'], 0],
        ['What did Zip see?', ['☀️ The sun', '🐷 A pig', '🌧️ Rain'], 0]
      ] },
    { title: 'Ten Hens', emoji: '🐔',
      text: `Ten hens sat in a pen. 🐔 The hens had ten eggs.

A fox ran to the pen! 🦊 The fox had a big grin.

The hens ran and hid. Six hid in a box. Four hid in a bin.

Toasty ran at the fox. 🐶 "Get out, fox!" said Toasty. "Ruff, ruff!"

The fox ran off. He ran up the hill and into his den. The hens are glad! They sat on the eggs.`,
      qs: [
        ['How many hens were there?', ['🔟 Ten', '2️⃣ Two', '5️⃣ Five'], 0],
        ['Who ran to the pen?', ['🦊 A fox', '🐷 A pig', '🐱 Biscuit'], 0],
        ['Who helped the hens?', ['🐶 Toasty', '🐰 Zip', '🐸 Plip'], 0]
      ] }
  ],
  3: [
    { title: 'Come and Play', emoji: '🤸',
      text: `It is a sunny day. "Come and play," said Zip. 🐰

"We can run," said Plip. 🐸 "Look at me go!"

"We can jump," said Toasty. 🐶 "I can jump up high!"

Biscuit came out to see his friends. "I like to play with you," said Biscuit. 🐱

They all run. They all jump. Then they sit down in the grass. "That was fun," said Zip. "Can we play one more time?" Here we go!`,
      qs: [
        ['Who said "Come and play"?', ['🐰 Zip', '🐱 Biscuit', '🐶 Toasty'], 0],
        ['What did Toasty want to do?', ['🦘 Jump', '😴 Sleep', '🍪 Eat'], 0],
        ['How does Biscuit feel about his friends?', ['😊 He likes to play with them', '😠 He is mad', '😢 He is sad'], 0]
      ] },
    { title: 'Where Is My Ball?', emoji: '⚽',
      text: `I have a blue ball. 🔵 I like to play with it. But where is my blue ball?

Is it here in my room? No.

Is it down there under the bed? No. I see a sock, but not my ball.

Is it in the yard? I go out to look. Look! It is up in the tree! 🌳

I can not get it down. It is too high for me. Zip can help me get it down. 🐰 She can jump up and get it!`,
      qs: [
        ['What color is the ball?', ['🔵 Blue', '🔴 Red', '🟡 Yellow'], 0],
        ['Where was the ball?', ['🌳 Up in the tree', '🛏️ Under the bed', '🏊 In the pond'], 0],
        ['Who will help get it?', ['🐰 Zip', '🐸 Plip', '🐔 A hen'], 0]
      ] },
    { title: 'One, Two, Three!', emoji: '🔢',
      text: `One, two, three. Jump with me! 🦘

Biscuit can jump. 🐱 He can jump up on a box.

Chip can jump. 🐥 She is little, but she can jump too.

Look at the funny frog jump! 🐸 He jumps so high. He jumps with his legs out. We all laugh.

Now we can all jump. One, two, three! We all jump and jump and jump!`,
      qs: [
        ['What do they count to?', ['3️⃣ Three', '🔟 Ten', '5️⃣ Five'], 0],
        ['What are they doing?', ['🦘 Jumping', '🏊 Swimming', '😴 Sleeping'], 0],
        ['Which jumper is funny?', ['🐸 The frog', '🐱 Biscuit', '🐥 Chip'], 0]
      ] }
  ]
};
// More starter stories so Levels 1–3 don't repeat so often.
SON_STARTER[1].push(
  { title: 'Biscuit Can Hop', emoji: '🐾',
    text: `I can hop. 🐱 Hop, hop, hop!

I can run. I run to the tree.

I can sit. I sit on a red mat.

I can nap in the sun. ☀️ The sun is hot. I like it.

Here is my pal. My pal is a dog. I can hug my pal! 🤗`,
    qs: [
      ['What can Biscuit do first?', ['🦘 Hop', '✈️ Fly', '🏊 Swim'], 0],
      ['Where does he nap?', ['☀️ In the sun', '🛁 In the tub', '🚗 In a car'], 0],
      ['What does he do last?', ['🤗 Hug his pal', '🍪 Eat a cookie', '📖 Read a book'], 0]
    ] },
  { title: 'The Red Bus', emoji: '🚌',
    text: `Zip is on a bus. 🚌 Zip has a bag.

The bus is red. It is a big bus.

The bus can go. Go, bus, go!

The bus can stop. 🛑 A dog gets on. A cat gets on.

The bus can go and go. Then it stops. Zip gets off. Zip is at the park! 🌳`,
    qs: [
      ['Who is on the bus?', ['🐰 Zip', '🐸 Plip', '🐶 Toasty'], 0],
      ['What color is the bus?', ['🔴 Red', '🔵 Blue', '🟢 Green'], 0],
      ['Where does Zip go?', ['🌳 To the park', '🏫 To school', '🏖️ To the beach'], 0]
    ] }
);
SON_STARTER[2].push(
  { title: 'Fox in a Box', emoji: '🦊',
    text: `A fox sat in a box. 🦊 It was a big box.

The box had a lid. The lid was up on top.

The fox did a big yawn. Then the lid fell on top! Bam!

The fox did not like it. It was dim in the box. "Help!" said the fox.

Biscuit ran to the box. Biscuit got the lid off. The fox ran to his den. 🏠 "Thank you!" said the fox.`,
    qs: [
      ['Where did the fox sit?', ['📦 In a box', '🌳 In a tree', '🛁 In a tub'], 0],
      ['What fell on top?', ['🟫 The lid', '🍎 An apple', '🎩 A hat'], 0],
      ['Who got the lid off?', ['🐱 Biscuit', '🐰 Zip', '🐔 A hen'], 0]
    ] },
  { title: 'Plip and the Bug', emoji: '🐛',
    text: `Plip is a frog. 🐸 Plip is wet and green.

Plip sat on a big log. The log is in the pond.

A bug sat on the log. 🐛 The bug had six legs.

Plip did a big hop. Hop! But the bug ran fast.

The bug ran up a stick. Plip did not get it. Plip sat back on the log. The sun was hot. Plip had a nap. 😴`,
    qs: [
      ['What is Plip?', ['🐸 A frog', '🐶 A pup', '🐷 A pig'], 0],
      ['What sat on the log with Plip?', ['🐛 A bug', '🦊 A fox', '🐱 A cat'], 0],
      ['What did Plip do at the end?', ['😴 Had a nap', '🏃 Ran home', '🍕 Ate pizza'], 0]
    ] }
);
SON_STARTER[3].push(
  { title: 'Help Me, Please!', emoji: '🐥',
    text: `Chip went up a big tree. She went up, up, up.

"Help me!" said Chip. 🐥 "I can not get down. It is too high!"

Zip and Plip came to the tree. "We will help you," said Zip and Plip.

They made a big pile of leaves. 🍂 It was soft and red and yellow.

"Jump!" they said. Chip jumped down into the leaves. She was OK! "Thank you!" she said. Then they all played in the leaves.`,
    qs: [
      ['Who needed help?', ['🐥 Chip', '🐰 Zip', '🐱 Biscuit'], 0],
      ['What did they make?', ['🍂 A pile of leaves', '🪜 A ladder', '🎂 A cake'], 0],
      ['What did Chip say at the end?', ['🙏 Thank you!', '👋 Goodbye!', '😴 Good night!'], 0]
    ] },
  { title: 'What Is in the Box?', emoji: '🎁',
    text: `Look! A big box is here. 📦 It has my name on it.

What is in it? I shake it. It does not make a sound.

Is it a ball? No.

Is it a hat? No. Is it a little car? No.

I open the box. It is a little cake for me! 🎂 Today is my birthday! My friends come to see me. We all play and eat.`,
    qs: [
      ['What is here?', ['📦 A big box', '🚌 A bus', '🐸 A frog'], 0],
      ['Was it a ball?', ['🙅 No', '👍 Yes', '🤷 Maybe'], 0],
      ['What was in the box?', ['🎂 A little cake', '🎩 A hat', '⚽ A ball'], 0]
    ] }
);
SON_TRACK.series.starter = { name: 'Read with Biscuit', emoji: '📗' };
for (const [n, list] of Object.entries(SON_STARTER)) {
  const L = SON_TRACK.levels[n - 1];
  L.stories = list.map(s => Object.assign(s, { series: 'starter' }));
}

/* ============================================================
   PHONICS PATH — original structured-literacy lessons.
   Progression modeled on the Stage 0–4 ladder in Dan's training list
   (letter sounds → CVC → digraphs/blends/endings → silent-e/vowel teams/
   r-controlled → multisyllable/affixes/contractions). All text is original;
   no book text is used.

   Lesson fields:
     id, stage, title, show (pattern shown big), say (spoken intro),
     ex: [[word, emoji]...]   example words for the Learn card
     words: [...]             Blend & Read words (decodable with taught patterns)
     build: [...]             words to spell with tiles (string, or array of chunks)
     heart: [[word, trickyPart, tip]]   irregular high-frequency words
     text: `...`              decodable passage (blank line = new page)
     qs: [[q, [opts], correctIndex]]
   Stage 0 lessons use letters: [[letter, sayString, keyword, emoji]] instead.
   ============================================================ */
const PHONICS_STAGES = [
  { n:0, name:'Letter Sounds',     icon:'🔤', desc:'What sound does each letter make?' },
  { n:1, name:'First Words',       icon:'🐣', desc:'Blend sounds into short words: c-a-t, cat!' },
  { n:2, name:'Sound Teams',       icon:'🤝', desc:'sh, ch, th, blends, and word endings' },
  { n:3, name:'Vowel Power',       icon:'⚡', desc:'Magic e, vowel teams, and bossy r' },
  { n:4, name:'Big Words',         icon:'🏔️', desc:'Two-part words, prefixes, suffixes, and real reading' }
];

const PHONICS = [
  /* ---------------- Stage 0: letter sounds ---------------- */
  { id:'0-1', stage:0, title:'s a t p i n', show:'s a t p i n',
    say:'These six letters are super helpers. Once you know them, you can read lots of words!',
    letters:[['s','sss','sun','☀️'],['a','aah','apple','🍎'],['t','tuh','turtle','🐢'],['p','puh','pig','🐷'],['i','ih','itch','🦟'],['n','nnn','nest','🪺']] },
  { id:'0-2', stage:0, title:'m d g o c k', show:'m d g o c k',
    say:'Six more letter sounds. Listen closely to each one!',
    letters:[['m','mmm','moon','🌙'],['d','duh','dog','🐶'],['g','guh','goat','🐐'],['o','ah','octopus','🐙'],['c','kuh','cat','🐱'],['k','kuh','kite','🪁']] },
  { id:'0-3', stage:0, title:'e u r h b f l', show:'e u r h b f l',
    say:'Here come seven more sounds, including two vowels: e and u.',
    letters:[['e','eh','egg','🥚'],['u','uh','umbrella','☂️'],['r','rrr','rocket','🚀'],['h','huh','hat','🎩'],['b','buh','ball','⚽'],['f','fff','fish','🐟'],['l','lll','lion','🦁']] },
  { id:'0-4', stage:0, title:'j v w x y z', show:'j v w x y z',
    say:'The last letters! Now you know every letter sound.',
    letters:[['j','juh','jam','🍓'],['v','vvv','van','🚐'],['w','wuh','web','🕸️'],['x','ks','fox','🦊'],['y','yuh','yo-yo','🪀'],['z','zzz','zebra','🦓']] },

  /* ---------------- Stage 1: first decoding (CVC) ---------------- */
  { id:'1-1', stage:1, title:'Short a', show:'a', say:'The letter a says aah, like at the start of apple.',
    ex:[['cat','🐱'],['map','🗺️'],['bag','👜']], words:['cat','map','sad','ham','tap','bag'], build:['cat','map','bag'],
    heart:[['the','e','The e in "the" says uh.']],
    text:`Sam has a cat.

The cat sat on a mat.

Pat the cat, Sam!`,
    qs:[['Who has a cat?',['🧒 Sam','🐶 A dog','🐟 A fish'],0],['Where did the cat sit?',['🟫 On a mat','🛏️ On a bed','🌳 In a tree'],0]] },
  { id:'1-2', stage:1, title:'Short i', show:'i', say:'The letter i says ih, like at the start of itch.',
    ex:[['pig','🐷'],['fin','🦈'],['six','6️⃣']], words:['pig','sit','win','lip','big','fin'], build:['pig','sit','fin'],
    heart:[['is','s','The s in "is" says zzz.']],
    text:`Tim is big.

Tim and the pig sit.

The pig did a jig!`,
    qs:[['Who sits with Tim?',['🐷 The pig','🐱 A cat','🐸 A frog'],0],['What did the pig do?',['💃 A jig','😴 A nap','🏊 A swim'],0]] },
  { id:'1-3', stage:1, title:'Short o', show:'o', say:'The letter o says ah, like at the start of octopus.',
    ex:[['dog','🐶'],['pot','🍲'],['log','🪵']], words:['dog','hot','mop','top','log','pot'], build:['dog','mop','pot'],
    heart:[['to','o','The o in "to" says oo.']],
    text:`The dog got on a log.

Mom has a hot pot.

Tom ran to the dog.`,
    qs:[['Where did the dog get on?',['🪵 A log','🚗 A car','🛏️ A bed'],0],['What does Mom have?',['🍲 A hot pot','🎈 A balloon','📕 A book'],0]] },
  { id:'1-4', stage:1, title:'Short u', show:'u', say:'The letter u says uh, like at the start of umbrella.',
    ex:[['sun','☀️'],['bug','🐛'],['cup','🥤']], words:['sun','bug','cup','run','tub','hut'], build:['sun','bug','cup'],
    heart:[['of','of','In "of", o says uh and f says vvv.']],
    text:`The sun is up.

A bug is in the cup.

Run, bug, run!`,
    qs:[['Where is the bug?',['🥤 In the cup','🛁 In the tub','🌳 In a tree'],0],['What is up in the sky?',['☀️ The sun','🌙 The moon','🎈 A balloon'],0]] },
  { id:'1-5', stage:1, title:'Short e', show:'e', say:'The letter e says eh, like at the start of egg.',
    ex:[['hen','🐔'],['bed','🛏️'],['web','🕸️']], words:['hen','bed','red','ten','pet','web'], build:['bed','hen','web'],
    heart:[['said','ai','The ai in "said" says eh.']],
    text:`Ten hens sat in a red bed.

"Get up!" said Meg.

The hens did not get up.`,
    qs:[['How many hens?',['🔟 Ten','2️⃣ Two','5️⃣ Five'],0],['Did the hens get up?',['🙅 No','👍 Yes','🏃 They ran'],0]] },
  { id:'1-6', stage:1, title:'Mix it up!', show:'a e i o u', say:'Now all five short vowels together. Look carefully at the middle letter!',
    ex:[['fox','🦊'],['jam','🍓'],['zip','🤐']], words:['jam','fix','hop','bud','vet','zip'], build:['fox','zip','jam'],
    heart:[['was','as','In "was", a says uh and s says zzz.']],
    text:`Max was a fox.

Max had a red van.

Zip! The van ran up the hill.`,
    qs:[['What kind of animal is Max?',['🦊 A fox','🐶 A dog','🐷 A pig'],0],['What color is the van?',['🔴 Red','🔵 Blue','🟢 Green'],0]] },

  /* ---------------- Stage 2: building phonics ---------------- */
  { id:'2-1', stage:2, title:'sh', show:'sh', say:'When s and h are together, they say shhh, like at the start of ship.',
    ex:[['ship','🚢'],['fish','🐟'],['shell','🐚']], words:['ship','shop','fish','dish','shed','wish'], build:['ship','fish','shed'],
    heart:[['they','ey','The ey in "they" says ay.']],
    text:`A fish is in a dish.

They wish to get a ship.

The ship is in the shop.`,
    qs:[['Where is the fish?',['🍽️ In a dish','🌊 In the sea','🛁 In a tub'],0],['What do they wish for?',['🚢 A ship','🎂 A cake','🐶 A pup'],0]] },
  { id:'2-2', stage:2, title:'ch', show:'ch', say:'When c and h are together, they say ch, like at the start of chick.',
    ex:[['chick','🐥'],['chip','🍟'],['bench','🪑']], words:['chip','chop','chin','chat','much','rich'], build:['chip','chin','chop'],
    heart:[['what','a','The a in "what" says uh.']],
    text:`Chad has a chip.

What a big chip!

Chop, chop, chop! Now Chad has ten chips.`,
    qs:[['What does Chad have?',['🍟 A chip','🍦 Ice cream','🍕 Pizza'],0],['How many chips at the end?',['🔟 Ten','1️⃣ One','3️⃣ Three'],0]] },
  { id:'2-3', stage:2, title:'ck', show:'ck', say:'At the end of a short word, c and k team up to say kuh, like in duck.',
    ex:[['duck','🦆'],['sock','🧦'],['clock','🕰️']], words:['duck','sock','kick','back','pack','neck'], build:['duck','sock','back'],
    heart:[['put','u','The u in "put" says oo, like in book.']],
    text:`Jack has a red sock.

Put the sock in the pack.

Quack! A duck got the sock!`,
    qs:[['What color is the sock?',['🔴 Red','🟡 Yellow','⚫ Black'],0],['Who got the sock?',['🦆 A duck','🐶 A dog','🧒 Jack'],0]] },
  { id:'2-4', stage:2, title:'th', show:'th', say:'When t and h are together, they say th. Stick your tongue out a tiny bit: th, like in thumb.',
    ex:[['thumb','👍'],['bath','🛁'],['three','3️⃣']], words:['this','that','then','thin','bath','with'], build:['bath','thin','with'],
    heart:[['from','o','The o in "from" says uh.']],
    text:`This is Beth.

Beth is in the bath with a duck.

The duck is from the shop.`,
    qs:[['Where is Beth?',['🛁 In the bath','🏫 At school','🌳 In the park'],0],['Where is the duck from?',['🏪 The shop','🌊 The pond','🏠 Next door'],0]] },
  { id:'2-5', stage:2, title:'wh and ng', show:'wh  ng', say:'wh says wuh, like in whale. And ng says the sound at the end of ring.',
    ex:[['whale','🐋'],['ring','💍'],['king','🤴']], words:['when','which','whip','ring','sing','long'], build:['ring','sing','whip'],
    heart:[['do','o','The o in "do" says oo.']],
    text:`When can we sing?

We sing a long song.

Ding, dong! Ring the bell!`,
    qs:[['What do they do?',['🎵 Sing a song','🏃 Run a race','🍳 Cook'],0],['What sound does the bell make?',['🔔 Ding, dong','🐶 Woof','💥 Boom'],0]] },
  { id:'2-6', stage:2, title:'Blends at the start', show:'fr  st  cl  sw', say:'Some words start with two sounds blended together, like f and r in frog. Say both sounds fast!',
    ex:[['frog','🐸'],['star','⭐'],['clap','👏']], words:['frog','stop','clap','swim','flag','drum'], build:['frog','stop','flag'],
    heart:[['come','o','In "come", o says uh and the e is quiet.']],
    text:`A frog can swim.

Come and clap for the frog!

Stop, frog, stop! The frog hops on a flag.`,
    qs:[['What can the frog do?',['🏊 Swim','✈️ Fly','📖 Read'],0],['Where did the frog hop?',['🚩 On a flag','🌳 In a tree','🛏️ On a bed'],0]] },
  { id:'2-7', stage:2, title:'Blends at the end', show:'mp  nd  st  lk', say:'Some words end with two sounds blended, like m and p in jump.',
    ex:[['jump','🦘'],['hand','✋'],['tent','⛺']], words:['jump','hand','lamp','nest','milk','tent'], build:['jump','nest','tent'],
    heart:[['want','a','The a in "want" says ah.']],
    text:`I want to jump on the bed!

The lamp is on the desk.

An egg is in the nest.`,
    qs:[['What does the kid want to do?',['🦘 Jump on the bed','😴 Sleep','🍪 Eat'],0],['What is in the nest?',['🥚 An egg','🐟 A fish','🧦 A sock'],0]] },
  { id:'2-8', stage:2, title:'Endings: -s -es -ing -ed', show:'-s  -es  -ing  -ed', say:'Endings change a word. One cat, two cats. I jump, I am jumping, I jumped!',
    ex:[['cats','🐱🐱'],['jumping','🦘'],['dishes','🍽️']], words:['cats','dogs','dishes','jumping','jumped','fished'], build:[['cat','s'],['jump','ing'],['dish','es']],
    heart:[['are','are','"Are" sounds like the letter r.']],
    text:`The cats are jumping.

The dog jumped in the mud.

The kids fished and fished, but no fish!`,
    qs:[['What are the cats doing?',['🦘 Jumping','😴 Sleeping','🍽️ Eating'],0],['Did the kids get a fish?',['🙅 No','👍 Yes, a big one','🐟 Ten fish'],0]] },

  /* ---------------- Stage 3: fluency bridge ---------------- */
  { id:'3-1', stage:3, title:'Magic e: a_e', show:'a_e', say:'A quiet e at the end is magic! It makes the a say its name: ay. Cap becomes cape!',
    ex:[['cake','🎂'],['lake','🏞️'],['gate','🚪']], words:['cake','lake','name','gate','tape','wave'], build:['cake','gate','tape'],
    heart:[['one','one','"One" sounds like "won".']],
    text:`Jake made a cake.

One cake for Kate!

They ate the cake by the lake.`,
    qs:[['What did Jake make?',['🎂 A cake','🪁 A kite','🚗 A car'],0],['Where did they eat it?',['🏞️ By the lake','🏫 At school','🚌 On a bus'],0]] },
  { id:'3-2', stage:3, title:'Magic e: i_e and o_e', show:'i_e  o_e', say:'Magic e works on i and o too! Kit becomes kite. Hop becomes hope.',
    ex:[['kite','🪁'],['bike','🚲'],['bone','🦴']], words:['bike','kite','time','home','rope','bone'], build:['kite','bone','rope'],
    heart:[['give','i','In "give", the i says ih, even with the e.']],
    text:`Mike rode his bike home.

Rose has a kite on a long rope.

Give the dog a bone!`,
    qs:[['How did Mike get home?',['🚲 On his bike','🚗 In a car','🚶 He walked'],0],['What does Rose have?',['🪁 A kite','🦴 A bone','🎂 A cake'],0]] },
  { id:'3-3', stage:3, title:'Magic e: u_e and e_e', show:'u_e  e_e', say:'With magic e, u says you, like in cube, and e says ee, like in these.',
    ex:[['cube','🧊'],['mule','🫏'],['flute','🪈']], words:['cute','mule','tube','cube','these','theme'], build:['cube','tube','cute'],
    heart:[['two','w','The w in "two" is quiet.']],
    text:`These two mules are cute.

The mules like to run in the dunes.

Then they nap in the shade.`,
    qs:[['How many mules?',['2️⃣ Two','1️⃣ One','🔟 Ten'],0],['What do the mules do at the end?',['😴 Nap in the shade','🏊 Swim','🍰 Eat cake'],0]] },
  { id:'3-4', stage:3, title:'ai and ay', show:'ai  ay', say:'a and i together say ay, like in rain. At the end of a word, a and y say ay, like in play.',
    ex:[['rain','🌧️'],['snail','🐌'],['play','🛝']], words:['rain','tail','mail','play','day','stay'], build:['rain','tail','play'],
    heart:[['four','our','The our in "four" says or.']],
    text:`It rains all day.

We stay in and play.

The cat wags its tail at the four of us.`,
    qs:[['What is the weather?',['🌧️ Rainy','☀️ Sunny','❄️ Snowy'],0],['What do they do inside?',['🎲 Play','🧹 Clean','😴 Sleep all day'],0]] },
  { id:'3-5', stage:3, title:'ee and ea', show:'ee  ea', say:'e and e together say ee, like in tree. e and a can say ee too, like in leaf.',
    ex:[['tree','🌳'],['sheep','🐑'],['leaf','🍃']], words:['tree','feet','sheep','seat','read','leaf'], build:['tree','sheep','leaf'],
    heart:[['friend','ie','The ie in "friend" says eh.']],
    text:`My friend has three sheep.

The sheep eat green grass by a big tree.

A leaf fell on a sheep. Peep!`,
    qs:[['How many sheep?',['3️⃣ Three','1️⃣ One','🔟 Ten'],0],['What do the sheep eat?',['🌿 Green grass','🍕 Pizza','🍦 Ice cream'],0]] },
  { id:'3-6', stage:3, title:'oa and ow', show:'oa  ow', say:'o and a together say oh, like in boat. o and w can say oh too, like in snow.',
    ex:[['boat','⛵'],['goat','🐐'],['snow','❄️']], words:['boat','goat','road','snow','grow','bowl'], build:['boat','goat','snow'],
    heart:[['door','oo','The oo in "door" says or.']],
    text:`A goat rows a boat in the snow.

The goat gets cold and goes home.

He shuts the door and eats a big bowl of oats.`,
    qs:[['What does the goat do in the snow?',['⛵ Rows a boat','🏂 Snowboards','🛷 Sleds'],0],['What does the goat eat at home?',['🥣 A bowl of oats','🍕 Pizza','🍎 An apple'],0]] },
  { id:'3-7', stage:3, title:'igh and y', show:'igh  y', say:'i, g, h together say eye, like in night. At the end of a short word, y says eye too, like in fly.',
    ex:[['night','🌙'],['light','💡'],['fly','🪰']], words:['night','light','high','fly','sky','my'], build:['light','high','fly'],
    heart:[['eye','eye','"Eye" sounds just like the letter i.']],
    text:`At night, the sky is black.

My light is bright.

I can see a kite fly up high, high, high!`,
    qs:[['What color is the night sky?',['⚫ Black','🔵 Blue','🟡 Yellow'],0],['What flies up high?',['🪁 A kite','🐟 A fish','🚗 A car'],0]] },
  { id:'3-8', stage:3, title:'Bossy r: ar and or', show:'ar  or', say:'When r comes after a vowel, it is bossy and changes the sound! a r says ar, like in car. o r says or, like in fork.',
    ex:[['car','🚗'],['star','⭐'],['corn','🌽']], words:['car','star','park','corn','fork','storm'], build:['car','star','fork'],
    heart:[['warm','ar','The ar in "warm" says or.']],
    text:`A star shines in the sky.

We drive the car to the park.

Oh no, a storm! We get in the warm car.`,
    qs:[['Where do they drive?',['🏞️ To the park','🏫 To school','🏪 To the store'],0],['Why do they get back in the car?',['⛈️ A storm comes','😴 They are tired','🍕 To eat'],0]] },
  { id:'3-9', stage:3, title:'Bossy r: er ir ur', show:'er  ir  ur', say:'These three teams all say the same sound: er, like in her, bird, and fur.',
    ex:[['bird','🐦'],['nurse','🧑‍⚕️'],['fern','🌿']], words:['her','bird','girl','fur','turn','fern'], build:['bird','turn','her'],
    heart:[['work','or','The or in "work" says er.']],
    text:`The girl has a pet bird.

Her bird can turn and twirl.

The girl and the bird work in the garden by the ferns.`,
    qs:[['What pet does the girl have?',['🐦 A bird','🐱 A cat','🐟 A fish'],0],['What can the bird do?',['🌀 Turn and twirl','🏊 Swim','📖 Read'],0]] },
  { id:'3-10', stage:3, title:'oi oy ou ow', show:'oi  oy  ou  ow', say:'oi and oy say oy, like in boy. ou and ow can say ow, like when you bump your toe: ow!',
    ex:[['coin','🪙'],['boy','👦'],['cow','🐄']], words:['coin','boy','toy','cloud','house','cow'], build:['coin','toy','cow'],
    heart:[['could','oul','The oul in "could" says oo, and the l is quiet.']],
    text:`The boy found a coin on the ground.

"Now I could get a toy cow!" he said.

He was so proud, he shouted, "Wow!"`,
    qs:[['What did the boy find?',['🪙 A coin','🐄 A cow','☁️ A cloud'],0],['What does he want to get?',['🐄 A toy cow','🚗 A toy car','🐶 A toy dog'],0]] },
  { id:'3-11', stage:3, title:'oo', show:'oo', say:'o and o together can say oo, like in moon. Sometimes they say a short oo, like in book.',
    ex:[['moon','🌙'],['zoo','🦁'],['book','📕']], words:['moon','food','zoo','book','look','foot'], build:['moon','book','zoo'],
    heart:[['school','ch','The ch in "school" says kuh.']],
    text:`Look at the moon!

After school, we read a book at the zoo.

The food at the zoo is so good.`,
    qs:[['Where do they read a book?',['🦁 At the zoo','🛏️ In bed','🚌 On the bus'],0],['How is the food?',['😋 Good','🤢 Yucky','🔥 Too hot'],0]] },

  /* ---------------- Stage 4: independent early reader ---------------- */
  { id:'4-1', stage:4, title:'Compound words', show:'sun + set', say:'Two small words can join to make one big word! Sun plus set makes sunset.',
    ex:[['sunset','🌅'],['cupcake','🧁'],['snowman','⛄']], words:['sunset','cupcake','rainbow','backpack','goldfish','snowman'], build:[['sun','set'],['cup','cake'],['snow','man']],
    heart:[['every','e','The second e in "every" is very quiet.']],
    text:`We packed a cupcake in my backpack.

At sunset, we saw a rainbow over the hill.

Every night, my goldfish swims in a circle.`,
    qs:[['What was in the backpack?',['🧁 A cupcake','🐟 A goldfish','⛄ A snowman'],0],['When did they see a rainbow?',['🌅 At sunset','🌙 At midnight','☀️ At breakfast'],0]] },
  { id:'4-2', stage:4, title:'Two-part words', show:'rab | bit', say:'Big words are made of parts called syllables. Read one part, then the next: rab, bit, rabbit!',
    ex:[['rabbit','🐇'],['picnic','🧺'],['kitten','🐈']], words:['rabbit','napkin','picnic','basket','muffin','kitten'], build:[['rab','bit'],['nap','kin'],['pic','nic']],
    heart:[['laugh','augh','The augh in "laugh" says aff.']],
    text:`A rabbit and a kitten had a picnic.

The basket had muffins and napkins.

The kitten told a joke, and the rabbit had to laugh!`,
    qs:[['Who had a picnic?',['🐇 A rabbit and a kitten','🐶 Two dogs','🐸 A frog'],0],['What was in the basket?',['🧁 Muffins and napkins','🍕 Pizza','🍎 Apples'],0]] },
  { id:'4-3', stage:4, title:'-le endings', show:'ap | ple', say:'When a word ends in a consonant plus l e, that last part says ul, like in apple and table.',
    ex:[['apple','🍎'],['turtle','🐢'],['candle','🕯️']], words:['apple','table','turtle','bubble','puzzle','candle'], build:[['ap','ple'],['ta','ble'],['can','dle']],
    heart:[['once','o','"Once" starts with a w sound: wuns.']],
    text:`Once, a turtle sat at a table.

It ate an apple and blew bubbles.

Then it did a puzzle by the light of a candle.`,
    qs:[['What did the turtle eat?',['🍎 An apple','🍰 Cake','🥕 A carrot'],0],['What did the turtle do last?',['🧩 A puzzle','🏊 Swam','😴 Slept'],0]] },
  { id:'4-4', stage:4, title:'Prefixes: un- and re-', show:'un-  re-', say:'A prefix goes at the front and changes the meaning. Un means not. Re means again. Unlock! Redo!',
    ex:[['unlock','🔓'],['redo','🔁'],['unhappy','☹️']], words:['undo','unlock','unhappy','redo','reread','repaint'], build:[['un','lock'],['re','do'],['re','paint']],
    heart:[['busy','u','The u in "busy" says ih.']],
    text:`The box was locked, so Max had to unlock it.

Oops! The puzzle fell, and he had to redo it.

Max was busy, but he was not unhappy. He liked it!`,
    qs:[['What did Max have to do to the box?',['🔓 Unlock it','🎨 Paint it','🗑️ Throw it away'],0],['How did Max feel?',['😊 Not unhappy, he liked it','😡 Angry','😢 Very sad'],0]] },
  { id:'4-5', stage:4, title:'Suffixes: -ful -less -ly', show:'-ful  -less  -ly', say:'A suffix goes at the end. Ful means full of. Less means without. Ly tells how something is done.',
    ex:[['helpful','🤝'],['quickly','⚡'],['fearless','🦁']], words:['helpful','careful','fearless','quickly','sadly','hopeless'], build:[['help','ful'],['fear','less'],['quick','ly']],
    heart:[['climb','b','The b in "climb" is quiet.']],
    text:`"Be careful!" said Mom.

The fearless cat ran quickly up the tree, but it could not climb down.

A helpful girl got a ladder and brought the cat down safely.`,
    qs:[['Where did the cat go?',['🌳 Up a tree','🏠 Into the house','🚗 Under a car'],0],['Who helped the cat?',['👧 A helpful girl','🐶 A dog','🚒 A firefighter'],0]] },
  { id:'4-6', stage:4, title:'Contractions', show:"can't  I'm  it's", say:"A contraction squishes two words into one. The apostrophe takes the place of missing letters. Can not becomes can't!",
    ex:[["can't",'🚫'],["I'm",'🙋'],["it's",'👉']], words:["can't","don't","it's","I'm","we'll","he's"], build:[['can',"'t"],['I',"'m"],['we',"'ll"]],
    heart:[['hungry','y','The y at the end of "hungry" says ee.']],
    text:`"I'm hungry, but I can't find a snack," said Ben.

"It's in the box!" said his sister. "We'll share it."

"Don't eat it all!" Ben laughed.`,
    qs:[['What was Ben looking for?',['🍪 A snack','🧸 A toy','👟 A shoe'],0],["What does \"we'll\" mean?",['👫 We will','🚫 We will not','❓ Where will'],0]] },
  { id:'4-7', stage:4, title:'Reading with feeling', show:'! ? " "', say:'Great readers change their voice! An exclamation mark means excited. A question mark means your voice goes up. Quotes mean someone is talking.',
    ex:[['Wow!','🤩'],['Why?','🤔'],['"Hi!"','👋']], words:['wow','why','yikes','hooray','whisper','shout'], build:['shout','why','wow'],
    heart:[['whisper','wh','The wh in "whisper" says wuh. Say it softly!']],
    text:`"Is it time for the race?" asked Rosa.

"Yes!" shouted Leo. "Ready, set, go!"

Rosa zoomed past the tree. "Hooray!" she cheered. "I did it!"

Leo was tired. "Wow," he whispered. "You are so fast."`,
    qs:[['What were Rosa and Leo doing?',['🏁 Having a race','🍰 Baking','📖 Reading'],0],['How did Leo say "Wow"?',['🤫 He whispered','📣 He shouted','🎵 He sang'],0]] },
  { id:'4-8', stage:4, title:'Chapter time!', show:'📖', say:'Time for a longer story! Read it smoothly, like you are telling it to a friend.',
    ex:[['map','🗺️'],['treasure','💰'],['shovel','⛏️']], words:['treasure','shovel','island','quickly','because','finally'], build:[['trea','sure'],['shov','el'],['fi','nal','ly']],
    heart:[['island','s','The s in "island" is quiet.']],
    text:`Nora found an old map in her grandpa's attic. A red X was drawn on a little island in the middle of the lake.

"Can we go?" she asked. Grandpa smiled and grabbed two shovels.

They rowed the boat to the island. Nora counted ten big steps from the tallest tree, and they began to dig.

Finally, the shovel hit something hard. It was a small tin box! Inside was a note: "The real treasure is the fun we had today."

Nora laughed. Grandpa had hidden it there when he was a boy, and now it was her turn to hide a new one.`,
    qs:[['Where did Nora find the map?',['🏠 In the attic','🏫 At school','🌳 In a tree'],0],['What was inside the box?',['📝 A note','💰 Gold coins','💎 A diamond'],0],['Who hid the box long ago?',['👴 Grandpa, when he was a boy','👧 Nora','🏴‍☠️ A pirate'],0]] }
];
const PHONICS_BY_ID = Object.fromEntries(PHONICS.map(l => [l.id, l]));
// Where each kid starts if the grown-up skips the Phonics Check
const PHONICS_DEFAULT_START = { son:'2-1', daughter:'3-1' };

/* ============================================================
   DAUGHTER'S TRACK — "Skyfire Academy" (Levels 1–4)
   Original characters: Wren (young dragon rider), Pebble (small gray
   earth dragon), Master Oona (teacher), Tobin & his fire dragon Blaze,
   Mira & her water dragon Ripple, and the mysterious Lord Vex.
   text -> blank line = new page;  qs -> [question, [options], correctIndex]
   ============================================================ */
const DAUGHTER_TRACK = {
  key: 'daughter',
  trackName: 'Skyfire Academy',
  hero: 'Wren',
  mascot: '🐉',
  levels: [
    {
      n: 1, title: 'New Rider', kind: 'story',
      stories: [
        { title: 'Wren Gets a Dragon', emoji: '📜',
          text: `Wren lived on a farm at the edge of the hills. One day, a big bird flew to her door. It had a note.

The note said, "Come to Skyfire Academy. A dragon is waiting for you!"

Wren ran to the gate. A small gray dragon sat in the grass. "I am Pebble," it said. Wren grinned. "Hi, Pebble!"`,
          qs: [
            ['Where did Wren live?', ['On a farm', 'In a castle', 'On a boat', 'In a cave'], 0],
            ['What brought the note?', ['A big bird', 'A dragon', 'A cat', 'A wizard'], 0],
            ['What was the name of the academy?', ['Skyfire Academy', 'Moon School', 'Dragon Hill', 'Stone Tower'], 0],
            ['What color was Pebble?', ['Gray', 'Red', 'Gold', 'Blue'], 0],
            ['How did Wren feel when she met Pebble?', ['Happy', 'Scared', 'Angry', 'Bored'], 0]
          ] },
        { title: "Pebble Can't Fly", emoji: '🪶',
          text: `Pebble had wings, but they were small. He flapped and flapped. He did not go up.

"I am too little," said Pebble. He hung his head.

Wren gave him a big hug. "We will practice every day," she said. "Then you will fly."`,
          qs: [
            ['What was wrong with Pebble\'s wings?', ['They were small', 'They were broken', 'They were wet', 'He had no wings'], 0],
            ['What did Pebble do with his wings?', ['Flapped and flapped', 'Folded them up', 'Painted them', 'Hid them'], 0],
            ['What did Wren give Pebble?', ['A big hug', 'A snack', 'A hat', 'A map'], 0],
            ['What will they do every day?', ['Practice', 'Sleep late', 'Go swimming', 'Bake bread'], 0],
            ['Why did Pebble hang his head?', ['He felt sad', 'He was hungry', 'He was sleepy', 'He saw a bug'], 0]
          ] },
        { title: 'The First Lesson', emoji: '✨',
          text: `Master Oona was the teacher at the academy. She had long white hair and a tall staff.

"Today you will learn to talk to your dragon," she said.

Wren sat with Pebble and shut her eyes. She felt a warm hum in her hand. It was Pebble! Wren smiled. They could talk without words.`,
          qs: [
            ['Who was the teacher?', ['Master Oona', 'Pebble', 'Wren\'s mom', 'Lord Vex'], 0],
            ['What did Master Oona hold?', ['A tall staff', 'A sword', 'A book', 'A cup'], 0],
            ['What was the lesson about?', ['Talking to your dragon', 'Flying fast', 'Cooking', 'Reading maps'], 0],
            ['What did Wren feel in her hand?', ['A warm hum', 'Cold ice', 'A sharp pinch', 'Sticky jam'], 0],
            ['What does "talk without words" mean here?', ['They could share thoughts', 'They shouted', 'They wrote notes', 'They stopped being friends'], 0]
          ] }
      ]
    },
    {
      n: 2, title: 'Apprentice', kind: 'story',
      stories: [
        { title: 'Meet Tobin and Mira', emoji: '🔥',
          text: `At lunch, Wren sat with two new friends. Tobin had a red fire dragon named Blaze. Blaze could puff hot smoke from his nose.

Mira had a blue water dragon named Ripple. Ripple liked to float in the pond and splash the other dragons.

"What can Pebble do?" asked Tobin. Wren did not know yet. Pebble looked down at his feet. "Maybe I can't do anything," he said in Wren's mind.`,
          qs: [
            ['What kind of dragon is Blaze?', ['A fire dragon', 'A water dragon', 'An ice dragon', 'A wind dragon'], 0],
            ['Who is Mira\'s dragon?', ['Ripple', 'Blaze', 'Pebble', 'Storm'], 0],
            ['What does Ripple like to do?', ['Float and splash in the pond', 'Puff smoke', 'Dig holes', 'Sleep in trees'], 0],
            ['What did Tobin ask?', ['What can Pebble do?', 'Where is lunch?', 'Can I ride Pebble?', 'Who is Master Oona?'], 0],
            ['How did Pebble feel when Tobin asked?', ['Unsure and a little sad', 'Proud', 'Silly', 'Angry'], 0]
          ] },
        { title: 'The Rain Day Race', emoji: '🌧️',
          text: `It was a gray, rainy day, but Master Oona said, "Today we race!" The dragons had to run along the trail to the old oak tree.

Blaze ran fast but stopped to dry his wet tail. Ripple slid along the mud like a boat. Pebble ran slow and steady. His feet did not slip at all.

When they reached the oak tree, Pebble was first! "Your feet grip the ground," said Master Oona. "That is an earth dragon's gift."`,
          qs: [
            ['What was the weather like?', ['Gray and rainy', 'Sunny and hot', 'Snowy', 'Windy and dry'], 0],
            ['Where did the race end?', ['At the old oak tree', 'At the pond', 'At the castle', 'At the farm'], 0],
            ['Why did Blaze stop?', ['To dry his wet tail', 'To eat lunch', 'He got lost', 'He fell asleep'], 0],
            ['Who won the race?', ['Pebble', 'Blaze', 'Ripple', 'Tobin'], 0],
            ['What is an earth dragon\'s gift, according to Master Oona?', ['Feet that grip the ground', 'Breathing fire', 'Swimming fast', 'Flying high'], 0]
          ] },
        { title: "Pebble's Secret", emoji: '💎',
          text: `That night, Wren could not sleep. She heard a soft tap, tap, tap. She peeked out and saw Pebble in the yard.

Pebble was tapping a rock with his claw. Each time he tapped, the rock began to glow with a green light. Soon the whole yard shone like a field of stars.

"Pebble!" Wren gasped. "You have earth magic!" Pebble's eyes grew wide. "I can make stones shine," he said. "Maybe I am special after all."`,
          qs: [
            ['Why was Wren awake?', ['She could not sleep', 'She was hungry', 'It was morning', 'Tobin called her'], 0],
            ['What sound did Wren hear?', ['Tap, tap, tap', 'Roar', 'Splash', 'Ding, dong'], 0],
            ['What color did the rocks glow?', ['Green', 'Red', 'Purple', 'Orange'], 0],
            ['What kind of magic does Pebble have?', ['Earth magic', 'Fire magic', 'Water magic', 'Ice magic'], 0],
            ['How did Pebble feel at the end?', ['Special and surprised', 'Bored', 'Scared of the dark', 'Grumpy'], 0]
          ] }
      ]
    },
    {
      n: 3, title: 'Junior Rider', kind: 'story',
      stories: [
        { title: 'The Floating Island', emoji: '🏝️',
          text: `High above the school, an island floated in the clouds. No one had been there in a hundred years. "It is not safe," the teachers always said.

One morning, Master Oona called the students together. "The island is sinking," she said. "Its magic crystals are fading. We need dragons who can fly up there. They must bring the crystals back to life."

Blaze and Ripple flew up with Tobin and Mira. Pebble watched them fly into the clouds. His small wings drooped. Wren rubbed his scaly head. "Your magic makes stones glow," she said softly. "Crystals are stones. Maybe the island needs you most of all."`,
          qs: [
            ['Where was the island?', ['Floating in the clouds', 'Under the sea', 'Inside a mountain', 'Behind the barn'], 0],
            ['Why was the island sinking?', ['Its magic crystals were fading', 'It was too heavy', 'A storm hit it', 'Dragons were sitting on it'], 0],
            ['Who flew up first?', ['Tobin and Mira with their dragons', 'Wren and Pebble', 'Master Oona alone', 'Lord Vex'], 0],
            ['What does "drooped" mean?', ['Hung down', 'Grew bigger', 'Lit up', 'Flapped fast'], 0],
            ['Why does Wren think Pebble could help?', ['Crystals are stones, and he makes stones glow', 'He flies the fastest', 'He is the biggest dragon', 'He knows the way'], 0]
          ] },
        { title: 'A Mysterious Visitor', emoji: '🧥',
          text: `The next day, a stranger came to the academy gate. He wore a long purple cloak. His boots were covered in black dust. He said he was a traveling merchant.

"I am looking for something golden," he said with a thin smile. "Something shaped like an egg." Master Oona's face went pale. "We have nothing like that here," she said firmly. Then she closed the gate.

Pebble sniffed the air after the stranger left. "His cloak smelled like smoke and thunder," he told Wren. "I do not trust him." Wren did not trust him either. She had noticed something odd. The merchant had no wagon and no goods to sell.`,
          qs: [
            ['What color was the stranger\'s cloak?', ['Purple', 'Green', 'Gray', 'White'], 0],
            ['What was the stranger looking for?', ['Something golden shaped like an egg', 'A lost dragon', 'A place to sleep', 'A map of the island'], 0],
            ['How did Master Oona react?', ['Her face went pale and she closed the gate', 'She laughed', 'She invited him in', 'She bought something'], 0],
            ['What did Pebble smell on the cloak?', ['Smoke and thunder', 'Flowers', 'Fresh bread', 'Salt water'], 0],
            ['Why did Wren think the merchant was not really a merchant?', ['He had no wagon and nothing to sell', 'He was too tall', 'He spoke too fast', 'He had a dragon'], 0]
          ] },
        { title: 'The Golden Star Egg', emoji: '🥚',
          text: `That night, Master Oona led Wren, Tobin, and Mira down a twisty staircase. It went deep under the school. At the bottom was a room lit by candles. On a soft red pillow sat a golden egg. It sparkled like a thousand tiny stars.

"This is the Star Egg," Master Oona said. "Inside is a storm dragon. It is the rarest dragon of all. It has been waiting to hatch for five hundred years. Whoever is with it when it hatches will share its bond."

"Is that what the stranger wanted?" asked Mira. Master Oona nodded slowly. "A cruel person could bond with a storm dragon. Then they could control the wind, the rain, and the lightning." Wren shivered. Pebble pressed close to her side to keep her calm.`,
          qs: [
            ['Where was the Star Egg kept?', ['In a room beneath the academy', 'On the floating island', 'In Wren\'s bedroom', 'In a tree'], 0],
            ['What kind of dragon is inside the egg?', ['A storm dragon', 'A fire dragon', 'An earth dragon', 'A water dragon'], 0],
            ['How long has the egg been waiting to hatch?', ['Five hundred years', 'Ten days', 'One year', 'Fifty years'], 0],
            ['What could a cruel person do with a storm dragon?', ['Control wind, rain, and lightning', 'Grow flowers', 'Make the moon disappear', 'Talk to fish'], 0],
            ['Why did Pebble press close to Wren?', ['To comfort her because she was scared', 'Because he was cold', 'To push her down the stairs', 'Because he was sleepy'], 0]
          ] }
      ]
    },
    {
      n: 4, title: 'Rider', kind: 'story',
      stories: [
        { title: 'The Egg Is Gone!', emoji: '😱',
          text: `Wren woke to the sound of bells ringing across the academy. She threw on her boots and ran into the hallway, with Pebble right behind her.

"The Star Egg is gone!" Tobin shouted, racing toward her. "Someone broke into the room last night!"

They hurried down the staircase. The velvet pillow was empty. The candles had been blown out, and the floor was covered in black dust.

"Black dust," Wren said slowly. "Just like the stranger's boots."

Master Oona knelt beside the pillow. "You are right," she said quietly. "That stranger was Lord Vex. He was once a student here, long ago."

"What should we do?" asked Mira, holding Ripple's tail tightly.

Master Oona stood up. "The egg will hatch at the next full moon. That is in three days. We must find it before then."`,
          qs: [
            ['What woke Wren up?', ['Bells ringing', 'A dragon roar', 'Rain on the roof', 'Tobin knocking'], 0],
            ['What did they find on the floor?', ['Black dust', 'Gold coins', 'Feathers', 'Water'], 0],
            ['Who was the stranger, really?', ['Lord Vex', 'A farmer', 'Master Oona\'s brother', 'A king'], 0],
            ['When will the egg hatch?', ['At the next full moon, in three days', 'Tomorrow morning', 'In one year', 'It already hatched'], 0],
            ['Why did Mira hold Ripple\'s tail tightly?', ['She was worried and scared', 'Ripple was running away', 'She was playing a game', 'Her hands were cold'], 0]
          ] },
        { title: 'Following the Footprints', emoji: '👣',
          text: `Outside the school walls, Wren saw something in the mud. "Footprints!" she called. "And they have black dust on them."

The footprints led to the Whispering Woods. It was a dark forest. The trees were so tall they blocked out the sun.

"Students are not allowed in the Whispering Woods," Tobin said nervously.

"Students are not allowed to let a storm dragon fall into the wrong hands, either," Mira said.

Wren looked at Pebble. Pebble looked back at her. Through their bond, she felt his heart beating fast with fear. But she felt something else, too. It was courage.

"We will go together," Wren said. "Master Oona is guarding the school. We will follow the trail. If we find something, we will send her a message."

Blaze puffed a little ring of smoke, which meant yes. Ripple flicked her tail. The three riders and their dragons stepped into the dark trees.`,
          qs: [
            ['What did Wren find in the mud?', ['Footprints with black dust', 'A golden feather', 'A broken egg shell', 'A map'], 0],
            ['Where did the footprints lead?', ['The Whispering Woods', 'The floating island', 'The farm', 'The pond'], 0],
            ['Why did Tobin feel nervous?', ['Students are not allowed in the woods', 'He lost Blaze', 'He was hungry', 'He saw Lord Vex'], 0],
            ['What did Blaze\'s smoke ring mean?', ['Yes', 'No', 'Run away', 'I am hungry'], 0],
            ['What two feelings did Wren sense from Pebble?', ['Fear and courage', 'Anger and boredom', 'Hunger and sleepiness', 'Silliness and joy'], 0]
          ] },
        { title: "Pebble's Big Jump", emoji: '🪽',
          text: `Deep in the woods, the path ended at a wide river. The water rushed and foamed over sharp rocks, and on the other side, the black footprints continued into the trees.

Ripple dove right in and swam across with Mira on her back. Blaze carried Tobin, flapping hard over the churning water.

Wren and Pebble stood alone on the muddy bank. "I can't fly that far," Pebble said quietly. "My wings are too small."

Wren knelt beside him. "Remember the race? You were slow and steady, and you never gave up."

Pebble took a deep breath. He backed up, ran as fast as he could, and leaped. His little wings beat once, twice, three times. For one amazing moment, Pebble was flying!

He landed on the other side with a thump, skidding through the slippery mud. Wren tumbled off, laughing. "You did it, Pebble! You flew!"

Pebble puffed out his chest proudly. "Only a little," he said. But his eyes were shining.`,
          qs: [
            ['What blocked the path?', ['A wide river', 'A tall wall', 'A sleeping giant', 'A deep hole'], 0],
            ['How did Ripple cross?', ['She swam', 'She flew', 'She jumped on rocks', 'She walked on a bridge'], 0],
            ['What did Wren remind Pebble about?', ['The race, where he did not give up', 'His mom', 'The Star Egg', 'His dinner'], 0],
            ['How many times did Pebble beat his wings?', ['Three times', 'Once', 'Ten times', 'He didn\'t'], 0],
            ['Why were Pebble\'s eyes shining at the end?', ['He was proud of himself', 'He was crying from pain', 'It was very bright', 'He was angry'], 0]
          ] }
      ]
    }
  ]
};

/* DAUGHTER'S TRACK — Levels 5–8 (the Star Egg quest continues) */
DAUGHTER_TRACK.levels.push(
  {
    n: 5, title: 'Senior Rider', kind: 'story',
    stories: [
      { title: 'Into the Whispering Woods', emoji: '🌲',
        text: `The deeper they walked, the quieter the forest became. The birds stopped singing. Even the wind seemed to hold its breath. Every few steps, the leaves above them rustled and whispered, as if the trees were sharing secrets.

"Do you hear that?" Mira asked. "It sounds like they're saying our names."

Tobin laughed, but it came out shaky. "Trees can't talk." Blaze lit a small flame on the tip of his tail so they could see the path.

Pebble tapped a stone with his claw, and it glowed green. He tapped another, and another, leaving a trail of shining stones behind them. "So we can find our way home," he explained.

"Smart thinking," Wren said proudly.

They walked until the black footprints stopped at the edge of a clearing. In the middle stood a ring of crooked trees, their branches twisted together like knotted fingers.

Suddenly, Ripple froze. Her blue scales stood up on her back. Then Wren saw them: two glowing yellow eyes, watching from the darkness between the trees.

The eyes blinked once. Then they began to move closer.`,
        qs: [
          ['What happened to the forest as they walked deeper?', ['It got quieter', 'It got louder', 'It got sunnier', 'It started snowing'], 0],
          ['Why did Pebble make a trail of glowing stones?', ['So they could find their way home', 'To scare animals', 'To make it pretty', 'To warn Lord Vex'], 0],
          ['How did Blaze help the group see?', ['He lit a flame on his tail', 'He carried a lantern', 'He made the moon shine', 'He flew above the trees'], 0],
          ['What does "the wind seemed to hold its breath" mean?', ['Everything became very still', 'The wind got stronger', 'The wind was sick', 'It started to rain'], 0],
          ['What did they see at the end of the chapter?', ['Two glowing yellow eyes', 'The Star Egg', 'Master Oona', 'A castle'], 0]
        ] },
      { title: 'The Eyes in the Dark', emoji: '👀',
        text: `Blaze growled, and Tobin raised his arms to protect his friends. But the creature that crept out of the shadows was not a monster at all. It was a small silver fox with yellow eyes and a fluffy tail that glittered like frost on a winter morning.

"Please don't hurt me," the fox squeaked nervously. "My name is Nim. I am a moon sprite."

Wren slowly knelt down so she would not frighten her. "We won't hurt you, Nim. We're searching for a man in a purple cloak who stole a golden egg."

Nim's ears flattened against her head. "Lord Vex," she whispered. "He traveled through here two nights ago. He trapped my whole family in a jar of shadows so we could not warn anyone."

Mira gasped. "That's terrible!"

"He's carrying the egg to his tower, which stands on the other side of the Fog Bridge," Nim continued. "If you help me rescue my family, I will show you the secret path."

Wren looked at her friends, and they all nodded.

"Deal," Wren said, holding out her hand. Nim placed her tiny paw gently in Wren's palm.

At that moment, a low rumble shook the ground beneath them. Far away, beyond the trees, a single bolt of purple lightning split the darkening sky.`,
        qs: [
          ['What was the creature with yellow eyes?', ['A silver fox moon sprite named Nim', 'A wolf', 'Lord Vex', 'A baby dragon'], 0],
          ['What did Lord Vex do to Nim\'s family?', ['Trapped them in a jar of shadows', 'Took them to the academy', 'Turned them into stones', 'Sent them to the island'], 0],
          ['Where is Lord Vex taking the egg?', ['To his tower', 'To the floating island', 'To the farm', 'To the river'], 0],
          ['What deal did Wren make with Nim?', ['Help free her family in exchange for the secret path', 'Give her the egg', 'Take her to the academy', 'Buy her food'], 0],
          ['What do you think the purple lightning means?', ['Lord Vex is using dark storm magic', 'A happy party', 'It is morning', 'Master Oona is coming'], 0]
        ] },
      { title: 'The Bridge of Fog', emoji: '🌫️',
        text: `Nim led them along a narrow path that twisted between enormous mushrooms. At last, they reached the edge of a deep canyon. Stretching across it was a bridge made entirely of thick white fog.

"Is that actually safe?" Tobin asked, poking it with a stick. The stick passed right through.

"The bridge only carries travelers who are brave," Nim explained. "If you feel afraid, the fog grows thinner."

Mira went first. She took a deep breath, and Ripple walked faithfully beside her. The fog held them up like a soft, cool cloud. Tobin and Blaze followed, and they made it across safely too.

Then it was Wren's turn. She stepped onto the fog with Pebble at her side. Halfway across, she made the terrible mistake of looking down. The canyon was so deep that she couldn't see the bottom.

Her heart pounded and her knees trembled. Beneath her boots, the fog began to disappear.

"Wren!" Mira shouted from the other side. "Don't look down!"

But it was too late. With a soft hiss, the fog beneath them started to vanish, and Wren felt herself beginning to fall.`,
        qs: [
          ['What was the bridge made of?', ['Fog', 'Stone', 'Wood', 'Ice'], 0],
          ['What makes the fog bridge get thinner?', ['Feeling afraid', 'Walking fast', 'Talking loudly', 'Carrying heavy things'], 0],
          ['Who crossed the bridge first?', ['Mira and Ripple', 'Wren and Pebble', 'Tobin and Blaze', 'Nim'], 0],
          ['What mistake did Wren make?', ['She looked down', 'She ran too fast', 'She forgot Pebble', 'She dropped her boots'], 0],
          ['Why is this ending called a "cliffhanger"?', ['It stops at an exciting moment so you want to read more', 'Someone is hanging from a cliff only', 'The story is over forever', 'It is a happy ending'], 0]
        ] }
    ]
  },
  {
    n: 6, title: 'Dragon Knight', kind: 'story',
    stories: [
      { title: 'Pebble Holds the Bridge', emoji: '🪨',
        text: `Wren squeezed her eyes shut, waiting for the fall. Instead, she felt something solid beneath her feet.

She opened her eyes. Pebble had slammed his claws down onto the vanishing fog. His earth magic was spreading outward in a bright green glow. Where the fog had been, smooth gray stones were appearing one after another, locking together like puzzle pieces.

"I've got you!" Pebble grunted, his whole body trembling. "Walk, Wren! Walk forward!"

Wren took one shaky step, then another. The stones held firm. Pebble crept along beside her, building the stone bridge just ahead of each footstep. Sweat glistened on his scales, but he refused to stop.

When they finally reached the other side, Pebble collapsed in a heap, completely exhausted. Mira and Tobin rushed over, cheering.

"Pebble, that was incredible!" Tobin shouted. "I didn't know earth dragons could build things out of nothing!"

"Neither did I," Pebble admitted, panting. He looked up at Wren. "When you were afraid, all I could feel was that I needed to save you. The magic just happened."

Wren wrapped her arms around his neck. "Master Oona says a dragon's power grows with the strength of its bond," she said softly. "I think our bond just got a lot stronger."

Nim's tail swished. "Come on," she said. "Lord Vex's tower is just over that hill. The full moon rises tomorrow night."

Behind them, the stone bridge glowed faintly in the dark. It was a sturdy path that would still be there for anyone who needed to cross.`,
        qs: [
          ['What did Pebble create to save Wren?', ['A bridge of stones', 'A rope', 'A fire', 'A cloud'], 0],
          ['How did the stones fit together?', ['Like puzzle pieces', 'Like a pile of sand', 'Like falling leaves', 'Like water drops'], 0],
          ['What does "exhausted" mean?', ['Extremely tired', 'Very happy', 'Hungry', 'Confused'], 0],
          ['According to Master Oona, what makes a dragon\'s power grow?', ['The strength of its bond', 'Eating lots of food', 'Getting older', 'Flying higher'], 0],
          ['Why might it matter that the bridge was still there at the end?', ['Others can cross safely, and it shows Pebble\'s magic lasts', 'It will fall down soon', 'Lord Vex built it', 'It is a trap'], 0]
        ] },
      { title: 'The Tower of Vex', emoji: '🏰',
        text: `Lord Vex's tower stood on top of a rocky hill. It looked like a crooked black finger pointing at the sky. Storm clouds swirled around its peak. Purple lightning flickered inside them.

The friends crouched behind a boulder. "There's only one door," Tobin whispered, "and it's guarded by those things." Two huge stone gargoyles sat on either side of the door. Their eyes glowed red.

"There's another way in," Nim said. "My family is trapped near the top, in a room with a round window. I can climb the vines, but I'm not strong enough to open the jar."

Mira studied the tower carefully. "Ripple can make it rain on the gargoyles. Water might distract them."

"And Blaze can make smoke to hide us," Tobin added.

The plan worked perfectly. Ripple sprayed a sudden shower over the gargoyles. They turned their heads, grumbling. Blaze puffed out a thick gray cloud. Hidden by the smoke, Wren and Pebble climbed up the vines behind Nim.

Through the round window, Wren saw a cluttered room full of dusty books and strange glass bottles. On a table sat a dark jar swirling with shadows. Next to it was the Star Egg, glowing brighter than ever.

But something else made Wren's breath catch. Pinned to the wall was an old drawing of a young boy riding a dragon. Beneath it, someone had written in shaky letters: "Vex and Thunder, Skyfire Academy."

"Lord Vex was a dragon rider," Wren whispered. "So what happened to his dragon?"`,
        qs: [
          ['What did the tower look like?', ['A crooked black finger pointing at the sky', 'A round golden dome', 'A tiny cottage', 'A tall glass castle'], 0],
          ['Who guarded the door?', ['Two stone gargoyles', 'Lord Vex\'s soldiers', 'A sleeping bear', 'Nobody'], 0],
          ['How did the team distract the guards?', ['Ripple made rain and Blaze made smoke', 'They threw rocks', 'They sang a song', 'They knocked on the door'], 0],
          ['What does "cluttered" mean?', ['Messy and full of stuff', 'Clean and empty', 'Very cold', 'Brightly lit'], 0],
          ['What did the old drawing reveal?', ['Lord Vex was once a dragon rider at Skyfire Academy', 'Where the treasure was', 'That Nim was a dragon', 'How to open the jar'], 0]
        ] },
      { title: 'The Trap', emoji: '🌹',
        text: `Wren carefully pushed open the round window and slipped inside. Pebble squeezed in after her, and Nim leaped onto the table beside the jar of shadows. Inside, Wren could see tiny silver shapes pressed against the glass: Nim's family.

"Pebble, can you crack it?" Wren whispered.

Pebble tapped the jar with his claw. A thin green line appeared across the glass. He tapped again, and the crack spread. With a soft pop, the lid flew off, and the shadows poured out like smoke. Five little silver foxes tumbled onto the table, squealing with joy as they hugged Nim.

Wren turned toward the Star Egg. She reached out to take it, but the moment her fingers touched its golden shell, the floor beneath her began to shake.

Thick, thorny vines burst up through the floorboards. They twisted and curled around Wren and Pebble, weaving themselves into a cage. Within seconds, they were trapped.

"I wondered when you would arrive," said a cold voice. Lord Vex stepped out from behind a bookshelf, his purple cloak sweeping across the floor. "Master Oona always did send children to do her work."

"Give back the egg!" Wren demanded, gripping the thorny bars.

Lord Vex smiled. "When the moon rises tomorrow, this egg will hatch, and the storm dragon will bond with me. Then no dragon will ever leave me again."

Wren noticed something flicker across his face, just for a moment. It wasn't anger. It looked like sadness.

Nim and her family had vanished out the window. Wren hoped they had gone for help, because the thorns were getting tighter.`,
        qs: [
          ['How many silver foxes were freed from the jar?', ['Five', 'Two', 'Ten', 'One'], 0],
          ['What happened when Wren touched the Star Egg?', ['Thorny vines trapped her in a cage', 'It hatched', 'It disappeared', 'It turned to stone'], 0],
          ['What does Lord Vex want the storm dragon to do?', ['Bond with him', 'Fly away', 'Destroy the academy', 'Protect Wren'], 0],
          ['What did Lord Vex mean by "no dragon will ever leave me again"?', ['A dragon left him before and he was hurt by it', 'He has too many dragons', 'He hates dragons', 'His dragon is sleeping'], 0],
          ['What do you think Nim and her family went to do?', ['Get help for Wren', 'Go to sleep', 'Find food', 'Join Lord Vex'], 0]
        ] }
    ]
  },
  {
    n: 7, title: 'Dragon Captain', kind: 'story',
    stories: [
      { title: 'Escape from the Thorn Cage', emoji: '🗝️',
        text: `Lord Vex swept out of the room, taking the Star Egg with him. The door slammed, and the lock clicked. Wren and Pebble were left alone in the thorny cage, watching helplessly as the last gray light faded from the round window.

"The thorns tighten whenever we move," Pebble said, wincing. A sharp point had snagged one of his scales.

Wren forced herself to stay perfectly still and concentrate. She remembered something Master Oona had taught them during their very first week: "Every kind of magic has an opposite. Fire fears water. Shadow fears light. Thorns fear..."

"Stone," Wren breathed. "Thorns grow in soil, but they can't grow through solid rock!"

Pebble's eyes lit up. He pressed his claws against the floor beneath the cage. Slowly, carefully, a layer of smooth gray stone spread outward from his feet. Wherever it touched the base of the vines, the thorns shriveled and turned brown. The cage began to sag.

"Keep going!" Wren urged.

Pebble pushed harder. The stone crept up the bars of the cage, and one by one, the thorny vines cracked and crumbled into dust. With a final snap, the cage collapsed around them.

They were free, but the heavy door was still locked, and although Wren rattled the handle with all her strength, it wouldn't budge.

Then they heard scratching at the window. Nim's small silver face appeared, grinning. Behind her, clinging to the vines, were Tobin and Mira.

"Nim explained everything that happened," Mira said, climbing carefully through the window. "Are you injured?"

"We're okay," Wren answered, brushing the crumbled thorn dust off her sleeves. "But Lord Vex took the egg to the top of the tower. The moon rises in a few hours."

Tobin peered out the window and pointed upward. The storm clouds around the tower's peak had grown enormous, crackling with purple light. Thunder rumbled so deeply that the walls trembled.

"Then we'd better hurry," he said, "because it looks like the storm is already starting."`,
        qs: [
          ['What happened when Wren and Pebble moved in the cage?', ['The thorns got tighter', 'The cage opened', 'The thorns grew flowers', 'Nothing happened'], 0],
          ['What lesson from Master Oona helped Wren?', ['Every kind of magic has an opposite', 'Always run from danger', 'Dragons never get tired', 'Thorns are friendly'], 0],
          ['What did Pebble use to defeat the thorns?', ['Stone magic', 'Fire', 'Water', 'A sword'], 0],
          ['What does "shriveled" mean?', ['Dried up and shrank', 'Grew taller', 'Turned bright green', 'Exploded'], 0],
          ['What does the growing storm tell us?', ['The egg may hatch soon and Vex\'s plan is starting', 'It\'s a sunny day', 'Master Oona has arrived', 'The adventure is over'], 0]
        ] },
      { title: 'Storm over the Tower', emoji: '⛈️',
        text: `Mira knelt by the locked door and placed her hand on Ripple's head. "Ripple, can you fill the keyhole?" Ripple carefully directed a thin stream of water into the lock, and immediately afterward Blaze breathed a short, scorching puff of fire. The water inside the lock turned to steam with a loud hiss, and the old metal popped open.

"Now that is teamwork," Tobin announced with a satisfied grin.

They raced up a spiral staircase that seemed to go on forever. The higher they climbed, the louder the thunder became. Rain lashed against the narrow windows, and the wind howled through cracks in the walls like an angry animal.

At the top, a wooden door hung open, banging back and forth in the wind. Beyond it was the roof of the tower, a flat circle of stone surrounded by a low wall. In the center stood Lord Vex, his cloak whipping wildly around him. He was holding the glittering Star Egg high above his head.

The full moon had just appeared between the storm clouds, and its silver light poured down onto the egg. The golden shell was glowing so brightly that Wren had to shield her eyes. A long crack zigzagged across its surface.

"It's hatching already!" Mira cried in alarm.

Lord Vex turned and saw them. "You're too late!" he shouted over the roaring wind. "In a moment, the storm dragon will open its eyes, and the first face it sees will be mine!"

Another crack split the shell. A bolt of lightning struck the tower wall, sending chunks of stone flying. Blaze spread his enormous wings to shield Tobin, while Ripple wrapped herself protectively around Mira.

Wren grabbed Pebble's side. Through their bond, she could feel that he was terrified, but he was not backing away.

"Pebble," she whispered, "the storm dragon is just a baby. It will be scared and confused. It doesn't need someone to control it. It needs someone to calm it down."

Pebble looked at her. "Then go," he said steadily. "I'll keep this crumbling tower standing."

The egg burst open in a flash of blinding white light.`,
        qs: [
          ['How did they open the locked door?', ['Ripple filled the lock with water and Blaze turned it to steam', 'Tobin kicked it', 'Nim had a key', 'Pebble broke it with stone'], 0],
          ['Where was Lord Vex at the top of the tower?', ['On the roof holding the egg', 'Hiding in a closet', 'Asleep in bed', 'Running away down the stairs'], 0],
          ['What made the egg start hatching?', ['The light of the full moon', 'Lord Vex\'s magic words', 'The rain', 'Pebble\'s glowing stones'], 0],
          ['What did Lord Vex want to happen?', ['The storm dragon to see his face first', 'The storm dragon to fly away', 'The egg to break into pieces', 'The students to take the egg'], 0],
          ['What does Wren believe the baby storm dragon needs?', ['Someone to calm it down', 'Someone to control it', 'To be locked in a cage', 'Lots of food'], 0]
        ] },
      { title: 'The Storm Dragon Hatches', emoji: '🐲',
        text: `When the light faded, a baby dragon sat among the broken pieces of golden shell. It was no bigger than a large dog, with silver-blue scales that crackled with tiny sparks. Its wings were folded tight against its body, and its huge eyes darted wildly around the stormy rooftop.

The baby dragon let out a frightened shriek, and instantly the wind doubled in strength while lightning struck the tower again and again.

"Look at me!" Lord Vex commanded, stepping toward it. "I am your master!"

The baby dragon flinched away from his harsh voice. Its sparks grew brighter and more dangerous, and the storm swirled even faster.

Behind Wren, the tower walls began to crack. Pebble planted his feet and pressed his claws against the stones. Green light rushed through the cracks, sealing them shut as quickly as they appeared. His legs trembled with exhaustion, but he held on.

Wren took a slow, careful step toward the baby dragon, and then another. She didn't shout, and she didn't give orders. She knelt down on the wet stone, so she wasn't any taller than the baby.

"Hey there," she said gently. "I know it's loud and scary. You've been asleep for a really long time. It's okay to be afraid."

The baby dragon's enormous eyes found hers, and its sparks flickered uncertainly.

Wren closed her eyes, the way Master Oona had taught her on the very first day. She didn't try to bond with the dragon. She simply let it feel what she was feeling: calm, and safe, and kind.

Gradually, the wind softened, the rain became a gentle drizzle, and the lightning disappeared.

When Wren opened her eyes, the baby dragon had crept forward and rested its head on her knee. Its sparks had faded to a soft blue glow.

"Impossible," Lord Vex whispered in disbelief. His arms fell to his sides. "It chose you."

"No," Wren said quietly. "It didn't choose anyone yet. It just needed to feel safe first."

Above them, the storm clouds parted, and the full moon shone down on the rooftop like a silver spotlight.`,
        qs: [
          ['What color were the baby dragon\'s scales?', ['Silver-blue', 'Bright red', 'Green', 'Black'], 0],
          ['What happened to the storm when the baby shrieked?', ['The wind doubled and lightning struck', 'The storm stopped', 'It started snowing', 'The moon disappeared'], 0],
          ['What was Pebble doing during this chapter?', ['Holding the tower together with stone magic', 'Fighting Lord Vex', 'Sleeping', 'Flying away'], 0],
          ['Why did Wren kneel down?', ['So she would not seem big and scary to the baby', 'Because she was tired', 'To pick up the shell', 'Because she slipped'], 0],
          ['What is the big difference between how Vex and Wren treated the dragon?', ['Vex tried to command it; Wren tried to comfort it', 'Vex was kind; Wren was mean', 'They did the same thing', 'Wren ignored the dragon'], 0]
        ] }
    ]
  },
  {
    n: 8, title: 'Dragon Guardian', kind: 'story',
    stories: [
      { title: "Lord Vex's Choice", emoji: '💜',
        text: `For a long moment, no one moved, and rainwater dripped steadily from the crumbling edges of the tower. The baby storm dragon yawned, revealing tiny pointed teeth, and snuggled closer to Wren's knee.

Lord Vex sank down heavily onto the low stone wall. Without the storm swirling dramatically around him, he no longer looked powerful; instead, he looked exhausted, and considerably older than Wren had expected.

"I saw the drawing on your wall," Wren said carefully. "Vex and Thunder, Skyfire Academy. Was Thunder your dragon?"

Lord Vex remained silent for so long that Wren assumed he wouldn't answer, but eventually he spoke in a low, unsteady voice. "Thunder was a wind dragon. We were bonded when I was approximately your age, and I was the most talented student in my class. I could make Thunder fly faster and higher than any other dragon."

"What happened?" Mira asked softly.

"I pushed him much too hard," Vex admitted miserably. "I never asked whether he was tired, or scared, or hurt. I only cared about winning. One day, during a race through the mountains, he simply... flew away. He never returned." Vex stared silently down at his empty hands. "I told myself that dragons couldn't be trusted. That if I found a dragon powerful enough, I could make it obey, and it would never leave."

Wren felt Pebble's thoughts brush gently against hers, warm and full of sympathy. He's lonely, Pebble said through their bond. He's been lonely for a very long time.

Wren stood up slowly, and the baby dragon remained close beside her feet. "Master Oona taught us that a bond isn't something you take," she said. "It's something you build, one day at a time. When I first met Pebble, he couldn't fly, and he believed he wasn't special. But I didn't love him because he was powerful. I loved him because he was Pebble."

Pebble pressed his head against her side, and Wren felt the familiar warm hum in her hand.

Lord Vex looked up at them with tears glistening in his eyes. "I don't know how to do that," he said. "I've forgotten how."

"Then come back to the academy," Wren said. "You can learn again. That's what schools are for."

Tobin's mouth fell open in astonishment, so Mira nudged him firmly with her elbow.

The baby storm dragon padded across the wet stones toward Lord Vex. It sniffed his muddy boot curiously. Vex didn't reach for it or command it; he simply held perfectly still, exactly the way Wren had.

The baby dragon studied him for a long moment, and then it turned around and trotted contentedly back to Wren.

Vex let out a breath that was almost a laugh. "Fair enough," he said. "I suppose I'll have to earn it."

Far below, the forest was beginning to glow with tiny green lights. Wren smiled, because Pebble's trail of shining stones was still there, patiently waiting to lead them all home.`,
        qs: [
          ['Who was Thunder?', ['Lord Vex\'s wind dragon from long ago', 'Master Oona\'s dragon', 'The baby storm dragon', 'Tobin\'s brother'], 0],
          ['Why did Thunder fly away?', ['Vex pushed him too hard and only cared about winning', 'Thunder got lost in fog', 'Master Oona sent him away', 'Thunder wanted to find the Star Egg'], 0],
          ['What does Wren say a bond is?', ['Something you build one day at a time', 'Something you take by force', 'A kind of rope', 'A magic spell'], 0],
          ['What did Wren invite Lord Vex to do?', ['Come back to the academy to learn again', 'Leave the kingdom forever', 'Keep the storm dragon', 'Fight Master Oona'], 0],
          ['What does "I suppose I\'ll have to earn it" show about Vex?', ['He is starting to understand trust must be earned', 'He is planning another trick', 'He is angry at the dragon', 'He wants to give up'], 0]
        ] },
      { title: 'The Long Flight Home', emoji: '🌄',
        text: `By sunrise, the group was standing at the edge of the canyon, looking at the stone bridge Pebble had built. In the golden morning light, the gray stones sparkled with tiny flecks of green.

"You built this?" Lord Vex asked Pebble, sounding genuinely amazed. Pebble ducked his head shyly. "I had to," he said. "Wren was falling."

They crossed the bridge together while Nim and her family scampered ahead, their silver tails flashing brilliantly in the sunlight. At the far side, Nim stopped and turned back to Wren.

"This is where my family's home is," she said. "Thank you for keeping your promise." She pressed something small and cold into Wren's palm. It was a smooth silver stone, shaped like a crescent moon. "If you ever need the moon sprites, hold this stone up to the night sky, and we will come."

Wren hugged Nim gently, and then the foxes vanished into the trees like drops of moonlight.

The remainder of the journey was long and exhausting. The baby storm dragon got tired quickly and kept stopping to nap in patches of sunshine. Every time it fell asleep, the clouds above them grew a little darker, and a light rain sprinkled down. Every time it woke up happy, the sky turned bright blue again.

"Its moods control the weather," Mira observed, fascinated. "When it's sad, it rains. When it's scared, there's lightning."

"Then we'd better keep it happy," Tobin said, and Blaze blew a stream of smoke rings that made the baby dragon chirp with delight.

When they reached the river, Wren looked at the rushing water and then at Pebble. "Want to try?" she asked.

Pebble's eyes sparkled. He backed up, ran as fast as he could, and leaped. His wings beat once, twice, three times, four, five, six. This time, he didn't just glide across the water. He rose higher, circled once above the treetops with Wren laughing on his back, and landed gracefully on the far bank.

Everyone cheered. Even Lord Vex clapped.

"His wings have gotten so much stronger," Mira said in wonder.

"Or maybe he just stopped believing they were too small," Wren replied.

At last, the towers of Skyfire Academy appeared over the hills. Standing at the gate, her white hair blowing in the breeze, was Master Oona. Her face was stern, but as the students drew closer, Wren could see that she was trying very hard not to smile.

Then Master Oona saw who was walking behind them, and her expression changed completely.

"Vex?" she whispered.`,
        qs: [
          ['What did Nim give Wren?', ['A silver crescent moon stone', 'A golden feather', 'A map', 'A baby fox'], 0],
          ['What controls the weather around the baby storm dragon?', ['Its moods', 'The time of day', 'Lord Vex', 'The river'], 0],
          ['How did Tobin and Blaze keep the baby dragon happy?', ['Blaze blew smoke rings', 'They sang songs', 'They gave it treats', 'They let it sleep'], 0],
          ['What was different about Pebble\'s second jump over the river?', ['He truly flew and circled above the trees', 'He fell into the water', 'He refused to jump', 'Blaze carried him'], 0],
          ['What does Wren mean when she says Pebble "stopped believing they were too small"?', ['Believing in yourself can help you do hard things', 'His wings shrank', 'He forgot how to fly', 'Wren used magic on him'], 0]
        ] },
      { title: 'The Ceremony of Stars', emoji: '🌟',
        text: `Three nights later, the entire academy gathered in the Great Hall for the Ceremony of Stars. Hundreds of candles floated near the ceiling. The walls glittered with crystals that the students had brought back from the floating island. Thanks to Pebble's earth magic, the island had stopped sinking. Now it drifted peacefully above the academy once more.

Wren sat in the front row between Tobin and Mira, nervously twisting the silver moon stone in her fingers. Pebble sat beside her, his scales polished until they gleamed.

Master Oona stepped onto the stage. "Tonight," she announced, "we honor three young riders who showed extraordinary courage. Tobin and Blaze, for their quick thinking and teamwork. Mira and Ripple, for their wisdom and calm under pressure."

Tobin and Mira walked up to receive glowing golden pins shaped like dragon wings. The audience applauded loudly.

"And finally," Master Oona continued, her voice growing warm, "Wren and Pebble. When Wren arrived at this academy, Pebble could not fly, and neither of them knew what he could do. Together, they built a bridge out of fog and broke through a cage of thorns. They held a tower together in a storm. They calmed the rarest dragon in the world. But the bravest thing Wren did was something else entirely." Master Oona paused. "She offered kindness to someone who had not been kind to her."

Wren's cheeks turned pink. She glanced toward the back of the hall, where Lord Vex sat quietly in a plain gray robe instead of his purple cloak. He gave her a small nod.

"Wren and Pebble," Master Oona declared, "I name you Dragon Guardians of Skyfire Academy, the youngest in five hundred years."

The hall exploded with cheers. Pebble let out a happy roar so loud that it made the candles flicker. Wren walked onto the stage, and Master Oona fastened a silver pin, shaped like a star, onto her collar.

Then a small silver-blue shape fluttered down from the rafters. The baby storm dragon had been watching from above. Now it landed softly on Wren's shoulder with a tiny rumbling purr.

"It still hasn't bonded with anyone," Master Oona said quietly. "It will choose when it is ready. Until then, it will stay here, where it is safe. Here it can learn what kindness feels like."

"Can it have a name?" Wren asked.

Master Oona smiled. "What would you call it?"

Wren thought for a moment. Outside the tall windows, a warm breeze stirred the leaves, and the sky was full of stars.

"Breeze," she said. "Because it doesn't have to be a storm."

Breeze chirped happily, and outside, every star seemed to shine a little brighter.

Pebble leaned against Wren's side. Through their bond, she felt the warm, familiar hum. Whatever adventure comes next, he told her, we'll face it together.

And Wren knew that they would.`,
        qs: [
          ['What happened to the floating island?', ['Pebble\'s magic stopped it from sinking', 'It crashed into the sea', 'Lord Vex took it', 'It disappeared'], 0],
          ['What did Master Oona say was Wren\'s bravest act?', ['Offering kindness to someone who had not been kind to her', 'Climbing the tower', 'Crossing the fog bridge', 'Winning the race'], 0],
          ['What title did Wren and Pebble receive?', ['Dragon Guardians of Skyfire Academy', 'Kings of the Forest', 'Storm Riders', 'Junior Students'], 0],
          ['What did Wren name the baby storm dragon?', ['Breeze', 'Thunder', 'Spark', 'Storm'], 0],
          ['Why did Wren choose that name?', ['Because it doesn\'t have to be a storm; it can be gentle', 'Because it was cold', 'Because it was Lord Vex\'s idea', 'Because it flew fast'], 0]
        ] }
    ]
  }
);

DAUGHTER_TRACK.rewards = [
  ['🔥','Cinder','fire'],['💧','Mistral','water'],['🪨','Granite','earth'],['🌪️','Gale','wind'],
  ['❄️','Frostwing','ice'],['⚡','Volt','storm'],['🌙','Lunara','moon'],['☀️','Solace','sun'],
  ['🌿','Thistle','forest'],['💎','Gemscale','crystal'],['🌋','Magmor','lava'],['🌊','Tidecrest','sea'],
  ['🌸','Blossom','flower'],['⭐','Stardust','star'],['🍂','Ember-Leaf','autumn'],['🌈','Prism','rainbow'],
  ['☁️','Nimbus','cloud'],['🪐','Cosmo','space'],['🌑','Shade','shadow'],['🎵','Lyric','song']
];

/* DAUGHTER'S TRACK — "Academy Tales": 2 extra stories per rank.
   These are side adventures. They come after the 3 main quest stories at each rank,
   so they're read when she stays at a rank for a while. Ranks 1–7 tales are set
   before the Star Egg quest; Rank 8 tales happen after it. */
const DAUGHTER_EXTRA = {
  1: [
    { title: 'Pebble Gets a Bath', emoji: '🛁',
      text: `Pebble was very muddy. Wren got a big tub and filled it up with water.

Pebble did not like the bath! He jumped out and shook and shook. Now Wren was wet and muddy too.

They both laughed. Then they jumped in the tub together.`,
      qs: [
        ['Why did Pebble need a bath?', ['He was muddy', 'He was hot', 'He was sleepy', 'He was hungry'], 0],
        ['What did Wren fill with water?', ['A big tub', 'A cup', 'A boot', 'A hat'], 0],
        ['Did Pebble like the bath at first?', ['No', 'Yes', 'He was asleep', 'He was not there'], 0],
        ['What happened when Pebble shook?', ['Wren got wet and muddy', 'The tub broke', 'He flew away', 'It began to snow'], 0],
        ['How did the story end?', ['They got in the tub together', 'Pebble ran off', 'Wren went to bed', 'Wren got mad'], 0]
      ] },
    { title: 'Snack Time', emoji: '🍎',
      text: `Dragons get hungry. Pebble likes to eat rocks! He likes red rocks best.

Wren likes apples. One day, Wren gave Pebble an apple. He did not like it. "Yuck!" he said.

Then Wren gave him a red rock. "Yum!" he said, and he ate it all up.`,
      qs: [
        ['What does Pebble like to eat?', ['Rocks', 'Apples', 'Fish', 'Bread'], 0],
        ['What color rock does Pebble like best?', ['Red', 'Blue', 'Gray', 'White'], 0],
        ['What does Wren like to eat?', ['Apples', 'Rocks', 'Bugs', 'Grass'], 0],
        ['What did Pebble say about the apple?', ['"Yuck!"', '"Yum!"', '"More, please!"', '"Thank you!"'], 0],
        ['What does this story teach us?', ['Friends can like different things', 'Rocks are good for people', 'Dragons hate food', 'Apples are bad'], 0]
      ] }
  ],
  2: [
    { title: 'The Lost Feather', emoji: '🪶',
      text: `Ripple loved shiny things. One morning, Master Oona's blue feather pen was missing. "Has anyone seen my feather?" she asked.

Wren and Pebble searched the hall. They peeked under every seat and behind every door. They did not find it.

At last, they checked the pond. There was Ripple, floating on her back, with the blue feather tucked under her chin! Ripple looked a little guilty. She gave the feather back and splashed away.`,
      qs: [
        ['What was missing?', ['Master Oona\'s blue feather pen', 'A golden egg', 'Wren\'s boots', 'A book'], 0],
        ['Where did Wren and Pebble look first?', ['In the hall', 'In the woods', 'On the roof', 'At the farm'], 0],
        ['Where did they finally find it?', ['At the pond', 'In the kitchen', 'In a tree', 'Under Wren\'s bed'], 0],
        ['Who had the feather?', ['Ripple', 'Blaze', 'Tobin', 'Pebble'], 0],
        ['Why do you think Ripple took the feather?', ['She loves shiny things', 'She needed to write a letter', 'She was cold', 'Master Oona gave it to her'], 0]
      ] },
    { title: 'Blaze Has a Cold', emoji: '🤧',
      text: `One gray morning, Blaze began to sneeze. Achoo! Each sneeze shot out a tiny puff of fire. "Oh no, he has a cold," said Tobin.

Wren made him warm tea with honey. Mira wrapped a big scarf around his neck. Pebble curled up beside him to keep him company.

By the next day, Blaze felt much better. His first sneeze-free roar was so loud it shook the leaves on the trees.`,
      qs: [
        ['What came out when Blaze sneezed?', ['A tiny puff of fire', 'Bubbles', 'Snow', 'Leaves'], 0],
        ['What did Wren make for Blaze?', ['Warm tea with honey', 'A cake', 'A bed', 'A hat'], 0],
        ['What did Mira give Blaze?', ['A big scarf', 'A blanket', 'A rock', 'A book'], 0],
        ['How did Pebble help?', ['He kept Blaze company', 'He made soup', 'He called a doctor', 'He sang loudly'], 0],
        ['What does "sneeze-free" mean?', ['Without sneezing', 'Sneezing a lot', 'A free sneeze', 'A cold sneeze'], 0]
      ] }
  ],
  3: [
    { title: 'The Library of Whispers', emoji: '📚',
      text: `The academy library was the quietest place in the whole castle. The books there were magic. If you listened closely, you could hear them whisper their stories to each other.

Wren needed a book about earth dragons. The librarian was an owl named Quill. He wore tiny round glasses. "Be very quiet," Quill hooted, "or the books will fly away."

Wren tiptoed between the tall shelves. Pebble tiptoed too, but his tail was not as careful. Thump! It bumped a shelf. All at once, a hundred books flapped their pages. They fluttered into the air like birds.

At last the books settled down. One landed right at Wren's feet. It was open to a page called "Earth Dragons Can Build." Wren grinned at Pebble. "I think your tail found just what we needed."`,
      qs: [
        ['What was special about the library books?', ['They whispered and could fly', 'They were made of gold', 'They were all blank', 'They were tiny'], 0],
        ['Who was the librarian?', ['An owl named Quill', 'Master Oona', 'Lord Vex', 'A cat'], 0],
        ['What made the books fly away?', ['Pebble\'s tail bumped a shelf', 'Wren sneezed', 'A window opened', 'Quill clapped'], 0],
        ['What does "fluttered" mean?', ['Flapped quickly and lightly', 'Fell like rocks', 'Burned up', 'Stayed still'], 0],
        ['Why did Wren say Pebble\'s tail "found what we needed"?', ['The book that landed was about earth dragons', 'His tail could read', 'He was looking for his tail', 'Quill told her so'], 0]
      ] },
    { title: 'Night Watch', emoji: '🌙',
      text: `Each night, two students took turns guarding the dragon stables. Tonight it was Wren and Tobin's turn. The moon was bright, and the air was chilly.

Just after midnight, they heard a strange noise. Clip, clop, clip, clop. Then came a loud CRUNCH. Tobin grabbed Wren's arm. "Something is eating the hay!"

Blaze lit the tip of his tail so they could see. There, munching happily in the hay pile, were three baby goats! They had escaped from the farm pen down the hill.

Wren laughed with relief. Pebble gently nudged the goats out the door, and Blaze's glowing tail lit the path as the friends led them home.`,
      qs: [
        ['What job did Wren and Tobin have?', ['Guarding the dragon stables', 'Cooking dinner', 'Cleaning the library', 'Feeding fish'], 0],
        ['What sound did they hear first?', ['Clip, clop', 'Roar', 'Splash', 'Ding, dong'], 0],
        ['What was really eating the hay?', ['Three baby goats', 'A wolf', 'A dragon', 'Lord Vex'], 0],
        ['How did Blaze help?', ['He lit his tail so they could see', 'He chased the goats', 'He ate the hay', 'He flew to the farm'], 0],
        ['How did Wren feel when she saw the goats?', ['Relieved', 'Furious', 'Scared', 'Bored'], 0]
      ] }
  ],
  4: [
    { title: 'The Great Cake Disaster', emoji: '🎂',
      text: `It was Master Oona's birthday, and the students wanted to surprise her with a cake.

"Blaze can bake it," Tobin said proudly. "His fire is perfect for baking!"

Blaze took a deep breath and blew. WHOOSH! When the smoke cleared, the cake was as black as a lump of coal.

"Maybe Ripple can cool it down," Mira suggested. Ripple sprayed it with water. Now the cake was black and soggy.

Wren stared at the mess. Then she had an idea. "Pebble, can you make a plate?"

Pebble tapped the table, and a smooth, glowing green plate of stone appeared. They set the sad little cake on top and covered it with fresh berries and flowers.

When Master Oona saw it, she laughed so hard that she had to sit down. "This," she said, wiping her eyes, "is the best cake I have ever been given."`,
      qs: [
        ['Why were the students making a cake?', ['It was Master Oona\'s birthday', 'It was Wren\'s birthday', 'They were hungry', 'It was a test'], 0],
        ['What went wrong when Blaze baked it?', ['It burned black', 'It melted', 'It flew away', 'It turned blue'], 0],
        ['What did Ripple\'s water do to the cake?', ['Made it soggy', 'Made it perfect', 'Made it freeze', 'Made it grow'], 0],
        ['What did Pebble make?', ['A glowing stone plate', 'A new cake', 'A candle', 'A card'], 0],
        ['Why did Master Oona call it the best cake?', ['Because her students made it with love and it made her laugh', 'Because it tasted perfect', 'Because it was huge', 'Because she was teasing them'], 0]
      ] },
    { title: 'Lost in the Maze', emoji: '🌿',
      text: `Behind the academy was a giant hedge maze. "Today's lesson," said Master Oona, "is to find your dragon in the middle. You will start on opposite sides."

Wren entered the maze alone. The green walls were so tall she couldn't see over them. Left, right, left again. Soon she had no idea where she was.

"Pebble?" she called. There was no answer.

Wren stopped and closed her eyes. She remembered their very first lesson. She breathed slowly and reached out with her mind.

There! She felt a warm hum, like a tiny tug, coming from her right.

"This way," she whispered. She followed the feeling around corner after corner. The hum grew stronger and warmer with every step.

Finally, she turned one last corner and found Pebble sitting in the center of the maze, wagging his tail.

"What took you so long?" he teased. "I've been waiting for ages!"`,
      qs: [
        ['What was the lesson in the maze?', ['Find your dragon in the middle', 'Find the exit fast', 'Pick flowers', 'Hide from Master Oona'], 0],
        ['Why couldn\'t Wren see where she was going?', ['The hedge walls were too tall', 'It was night', 'She lost her glasses', 'It was foggy'], 0],
        ['What did Wren do when she was lost?', ['Closed her eyes and reached out with her mind', 'Cried for help', 'Climbed the hedge', 'Went back to start'], 0],
        ['What did she feel that guided her?', ['A warm hum, like a tug', 'A cold wind', 'A loud noise', 'A map in her pocket'], 0],
        ['Was Pebble really upset that Wren took so long?', ['No, he was teasing her', 'Yes, he was angry', 'Yes, he was crying', 'He was asleep'], 0]
      ] }
  ],
  5: [
    { title: 'The Dragon Who Wouldn\'t Wake', emoji: '⛰️',
      text: `Beyond the academy stood a round green hill that everyone called Old Moss. What most people didn't know was that Old Moss wasn't really a hill at all. It was an ancient earth dragon who had been sleeping for a thousand years, covered in grass and wildflowers.

One afternoon, the ground began to tremble. Cups rattled in the kitchen. Books slid off the library shelves. "Old Moss is restless," Master Oona said with a worried frown. "If he wakes up angry, he could shake the whole academy apart."

Pebble pressed his claws into the dirt and listened. Through the earth, he could feel something deep and heavy and sad. "He's having a bad dream," Pebble whispered. "He's dreaming that he's all alone."

Wren knelt beside him. "What do you do when I have a bad dream?" she asked.

"I hum to you," said Pebble.

So Pebble hummed. He hummed a low, gentle tune and sent it down through the stones, deeper and deeper, all the way to the sleeping giant. Slowly, the shaking stopped. The cups stopped rattling.

Then, on the side of the hill, a huge stone eyelid slid open. An eye as big as a wagon wheel looked straight at Pebble.

"Little one," rumbled a voice like distant thunder. "Come back tomorrow. I have something to teach you."`,
      qs: [
        ['What was Old Moss, really?', ['An ancient sleeping earth dragon', 'A normal hill', 'A castle', 'A giant tree'], 0],
        ['What happened when Old Moss got restless?', ['The ground trembled and things shook', 'It started raining', 'The flowers grew', 'The sun went dark'], 0],
        ['What was Old Moss dreaming about?', ['Being all alone', 'Eating cake', 'Flying fast', 'Lord Vex'], 0],
        ['How did Pebble calm him down?', ['He hummed a gentle tune through the stones', 'He shouted loudly', 'He threw rocks', 'He poured water'], 0],
        ['Why might Old Moss want to teach Pebble?', ['Pebble is an earth dragon like him and showed kindness', 'Pebble woke him on purpose', 'Pebble is the biggest dragon', 'Master Oona told him to'], 0]
      ] },
    { title: 'Sky Race Tryouts', emoji: '🏁',
      text: `Every spring, the academy chose a team for the Great Sky Race. Riders and their dragons would fly around the tallest mountains and back again. Everyone wanted to be chosen.

Tobin and Blaze made the team easily. So did Mira and Ripple. But Pebble still couldn't fly, so Wren sat quietly on the grass, trying not to feel disappointed.

Master Oona sat down beside her. "A team needs more than fast wings," she said. "It needs someone who can read the wind and the clouds. Someone who notices everything. Will you be our navigator?"

Wren's eyes went wide. "Me?"

On the day of the race, Wren stood at the top of the tower with a map and a spyglass. She carefully studied the clouds and the bending trees. "Storm approaching from the north!" she called through a brass horn. "Fly low through the valley!"

The other teams flew straight into the storm and were blown far off course. But the Skyfire team zipped safely through the valley and crossed the finish line first.

That night, Pebble leaned against Wren. "Next year," he whispered, "I'll be flying in that race, and you'll be riding on my back."`,
      qs: [
        ['What was the Great Sky Race?', ['A flying race around the tallest mountains', 'A running race', 'A swimming race', 'A cooking contest'], 0],
        ['Why couldn\'t Wren race?', ['Pebble couldn\'t fly yet', 'She was sick', 'She was too young', 'She didn\'t want to'], 0],
        ['What job did Master Oona give Wren?', ['Navigator', 'Cook', 'Judge', 'Doctor'], 0],
        ['How did Wren help the team win?', ['She warned them about a storm and told them to fly low', 'She flew the fastest', 'She cheated', 'She stopped the other teams'], 0],
        ['What lesson does this story teach?', ['There are many ways to be part of a team', 'Only the fastest matter', 'Never try new things', 'Storms are fun'], 0]
      ] }
  ],
  6: [
    { title: 'Lessons from Old Moss', emoji: '💎',
      text: `The next morning, Pebble and Wren climbed the side of Old Moss. The ancient dragon's voice rumbled up through the grass beneath their feet.

"Little one, you have great power," he said. "But power without patience is like a river without banks. It floods and destroys. Today, you will grow a crystal."

Pebble's eyes sparkled. A crystal! He pressed his claws to a flat gray stone and pushed his magic into it as hard as he could. A green crystal shot up, bigger and bigger, until suddenly, CRACK! It shattered into a hundred pieces.

Pebble's ears drooped. "I ruined it."

"You rushed it," Old Moss corrected gently. "Stone is patient. Mountains take a million years to grow. Try again, but this time, go slowly. Listen to the stone. Let it tell you how fast it wants to grow."

Pebble took a deep breath. This time, he placed his claws on the stone as gently as if it were a sleeping baby bird. He didn't push. He listened.

At first, nothing happened. Wren held her breath. Then, very slowly, a tiny point of green light appeared. It grew one delicate facet at a time, then another, and another. It took the whole afternoon. By the time the sun began to set, Pebble had grown a crystal as clear as water, glowing with a soft green heart.

It was magnificent.

Pebble carefully picked it up and placed it in Wren's hands. "For you," he said. "Because you're always patient with me."

Under the grass, Old Moss rumbled with something that sounded very much like a happy laugh.`,
      qs: [
        ['What did Old Moss say power without patience is like?', ['A river without banks', 'A bird without wings', 'A cake without frosting', 'A sky without stars'], 0],
        ['What happened to Pebble\'s first crystal?', ['It shattered because he rushed', 'It turned to water', 'It flew away', 'It was perfect'], 0],
        ['What does "delicate" mean?', ['Fine and easily broken', 'Huge and heavy', 'Loud and noisy', 'Dark and scary'], 0],
        ['How long did the second crystal take to grow?', ['The whole afternoon', 'One second', 'A million years', 'Three days'], 0],
        ['Why did Pebble give the crystal to Wren?', ['She is always patient with him', 'He didn\'t want it', 'Old Moss told him to', 'It was too heavy'], 0]
      ] },
    { title: 'The Market Day Mix-Up', emoji: '🍏',
      text: `Once a month, the students were allowed to visit the village market. The streets were bustling with people selling bread, cheese, ribbons, and toys. Wren loved the smell of cinnamon rolls drifting from the bakery.

At the top of the hill, a farmer was unloading his cart, which was piled high with apples. Suddenly, one of the cart's wheels snapped. The cart tipped over, and hundreds of apples went tumbling down the steep street.

"Look out!" someone shouted.

The apples bounced and rolled faster and faster. A little boy was standing right in their path, holding a balloon and staring in surprise. People screamed. Chickens flapped. It was complete chaos.

"Pebble, a wall!" Wren cried.

Pebble slammed his front feet onto the cobblestones. A low stone wall rose up across the street, just in front of the little boy. The apples hit the wall with a hundred soft thuds and piled up safely behind it.

Blaze flew down and carried the boy back to his mother. Ripple washed the dusty apples clean with a gentle spray. Mira and Tobin helped the farmer gather them into baskets.

The grateful farmer gave each dragon a reward: a shiny red apple. Blaze gobbled his in one bite. Ripple tossed hers in the air and caught it.

Pebble sniffed his apple and quietly handed it to Wren. Then he wandered over to the stone wall he had built, picked out a nice red pebble, and crunched it happily.

"Some things," Wren laughed, "never change."`,
      qs: [
        ['What does "bustling" mean?', ['Busy and full of people', 'Empty and quiet', 'Cold and wet', 'Dark and scary'], 0],
        ['What caused the apples to roll down the hill?', ['A wheel on the cart snapped', 'A dragon knocked them', 'An earthquake', 'The farmer threw them'], 0],
        ['Who was in danger?', ['A little boy with a balloon', 'Master Oona', 'The farmer\'s horse', 'Tobin'], 0],
        ['How did Pebble stop the apples?', ['He built a stone wall', 'He ate them', 'He caught them', 'He blew them away'], 0],
        ['Why did Wren say "some things never change"?', ['Pebble still preferred rocks over apples', 'The market was always busy', 'The cart always breaks', 'Blaze always eats fast'], 0]
      ] }
  ],
  7: [
    { title: 'The Ice Caves', emoji: '🧊',
      text: `In the middle of winter, Master Oona led the students on an expedition to the Frostfang Caves, high in the snowy mountains. Deep inside the caves grew glowcrystals. The academy used them to light its lanterns through the long, dark winter nights.

The caves were breathtaking. Icicles hung from the ceiling like crystal chandeliers. The frozen walls shimmered blue and silver. Every footstep echoed.

"Stay together," Master Oona warned. "The ice here can be thin."

Tobin spotted a cluster of glowcrystals sparkling on the far side of a frozen pool. "I'll grab those!" he called, and before anyone could stop him, he stepped onto the ice.

CRACK.

The ice gave way beneath him, and Tobin vanished through a hole in the floor. A moment later, his voice echoed up from below. "I'm okay! But I'm in a lower cave, and I can't climb out. The walls are too slippery!"

Blaze roared and rushed toward the hole, flames already flickering in his throat.

"Wait!" Mira shouted. "If you use fire, you'll melt the ice ceiling above us. The whole cave could collapse!"

Blaze froze. Smoke curled from his nostrils, but he swallowed his fire. He looked desperately from the hole to Mira.

Mira knelt beside Ripple. "Water can become ice," she said slowly. "Ripple, can you make stairs?"

Ripple closed her eyes. She drew water from the frozen pool and shaped it, step by step, into a spiral staircase that curled down into the darkness. Each step froze solid as soon as it formed. But the steps were thin, and they creaked under their own weight.

"Pebble," Wren said, "can you make them stronger?"

Pebble laid his claws on the cave floor. Threads of green stone spread through the ice like roots, weaving beneath every step until the staircase was as sturdy as a castle tower.

Tobin climbed up, shivering. Blaze wrapped his warm wings around him, careful to keep his fire gentle and low.

Back at the academy that night, Master Oona spoke to the students beside a crackling fireplace. "Today you learned something important," she said. "The most powerful magic is not always the right magic. Sometimes the strongest thing a dragon can do is hold back, and let a friend help instead."

Blaze rested his head on Tobin's lap and sighed. He understood.`,
      qs: [
        ['Why did the students go to the Frostfang Caves?', ['To collect glowcrystals for lanterns', 'To find the Star Egg', 'To go ice skating', 'To hide from a storm'], 0],
        ['What happened to Tobin?', ['He fell through thin ice into a lower cave', 'He got lost in the snow', 'He froze solid', 'He found a treasure'], 0],
        ['Why did Mira stop Blaze from using fire?', ['It could melt the ceiling and make the cave collapse', 'Fire is against the rules', 'Blaze was too tired', 'Tobin was scared of fire'], 0],
        ['How did Ripple and Pebble work together?', ['Ripple made ice stairs and Pebble made them stronger with stone', 'They both used fire', 'Pebble dug a tunnel alone', 'Ripple carried Tobin'], 0],
        ['What did Master Oona say was the lesson?', ['The most powerful magic is not always the right magic', 'Always use your strongest power', 'Never go into caves', 'Ice is stronger than fire'], 0]
      ] },
    { title: 'Mira\'s Secret Fear', emoji: '🫧',
      text: `The Flying Exam was only three days away, and every student had to pass it. Each rider would fly with their dragon from the top of the academy tower, around the bell, and back down to the courtyard.

Mira seemed excited about it. She talked about the exam at breakfast, lunch, and dinner. But Wren noticed something strange. Every time they practiced on the tower, Mira found a reason to leave early. Her hands shook. Her face turned pale.

That evening, Wren found Mira sitting alone beside the pond, with Ripple floating quietly nearby.

"You don't have to tell me," Wren said, sitting beside her. "But I think you might be scared of heights."

Mira was quiet for a long time. Then her eyes filled with tears. "Water dragons are supposed to be calm and brave," she whispered. "Everyone thinks I'm the calm one. If they find out I'm scared, they'll think I don't deserve Ripple."

Wren picked up a smooth stone and turned it over in her fingers. "Do you know what happened to me on the fog bridge in my dreams last night? I looked down, and I froze. I'm scared of falling too."

Mira looked up, surprised. "You are?"

"Everyone's scared of something," Wren said. "Master Oona says courage isn't about not being scared. It's about being scared and taking one small step anyway."

The next morning, the two girls climbed the tower together. They didn't go to the top. They went up just three stairs, then stopped and breathed. The next day, they went up ten. Ripple and Pebble waited patiently at the bottom, sending warm, steady feelings through their bonds.

By the third day, Mira could stand at the very top. Her knees still trembled. But she held Wren's hand, looked straight ahead at the sky instead of down at the ground, and nodded.

When it was her turn for the exam, Mira climbed onto Ripple's back. Ripple flew in a smooth, steady circle around the bell, as gentle as a boat on a quiet lake. They landed softly in the courtyard, and the whole school cheered.

Mira ran straight to Wren and hugged her. "I was still scared the whole time," she laughed.

"I know," Wren said, grinning. "That's what made it brave."`,
      qs: [
        ['What did students have to do in the Flying Exam?', ['Fly around the bell and land in the courtyard', 'Race to the mountains', 'Swim across the pond', 'Write a test'], 0],
        ['What clues showed that Mira was scared?', ['She left practice early, her hands shook, and she turned pale', 'She laughed a lot', 'She ate too much', 'She talked about it all day'], 0],
        ['Why didn\'t Mira want anyone to know?', ['She worried people would think she didn\'t deserve Ripple', 'She wanted to win a prize', 'She was angry at Wren', 'She forgot'], 0],
        ['How did Mira and Wren practice?', ['A few more stairs each day', 'Jumping off the roof', 'Closing their eyes', 'Flying at night'], 0],
        ['What does Wren mean by "That\'s what made it brave"?', ['Being brave means doing it even when you\'re scared', 'Mira was not really scared', 'Bravery means never feeling fear', 'Ripple did all the work'], 0]
      ] }
  ],
  8: [
    { title: 'Vex\'s First Lesson', emoji: '🌬️',
      text: `When Lord Vex returned to Skyfire Academy, the students weren't sure what to think. He no longer wore his purple cloak. Instead, he wore the same plain gray robe as everyone else, and he insisted that people simply call him Vex.

Master Oona gave him the same jobs as every first-year student. He swept the courtyard. He cleaned the stables. He sat in the back row of Wren's very first lesson, the one about listening to dragons, looking enormously uncomfortable among a crowd of seven-year-olds.

"He looks miserable," Tobin whispered.

"He looks like he's trying," Wren whispered back.

Every evening, Vex did something curious. He carried a basket of fresh fish to the edge of the eastern cliffs, set it down on a flat rock, and then walked twenty paces away and sat in the grass. He didn't call out. He didn't wave. He just waited.

One evening, Wren and Pebble followed him, hiding behind a boulder.

"What is he waiting for?" Pebble whispered.

As the sun sank low, a shape appeared over the distant mountains. It was a wild wind dragon, sleek and silver, with a single dark stripe along its back. It circled high above the cliffs, watching Vex suspiciously. Then it dove, snatched a fish from the basket, and soared away.

Vex didn't move. He didn't try to follow it. He simply smiled a little, picked up the empty basket, and walked back to the academy.

"He's been doing this for weeks," Wren realized. "He's not trying to catch it. He's letting it decide whether to trust him."

Night after night, the wind dragon came a little closer. First it landed on the rock. Then it stayed long enough to eat two fish instead of one. Then, one cool evening, it landed in the grass just a few feet from where Vex sat.

They looked at each other for a long, silent moment.

Then Vex said, very softly, "You have the same stripe that Thunder had. Are you one of his children?"

The wind dragon tilted its head. It took one cautious step forward, and then another. At last, it lowered its long silver neck and rested its chin, very lightly, on Vex's shoulder.

Vex closed his eyes. A single tear rolled down his cheek.

From behind the boulder, Wren felt Pebble's warm hum against her hand. "He's learning," Pebble said quietly. "It's slow. But he's learning."

"Like a crystal," Wren whispered, and Pebble smiled, because he knew exactly what she meant.`,
      qs: [
        ['How had Vex changed when he returned?', ['He wore a plain gray robe and did first-year jobs', 'He became the headmaster', 'He wore a golden crown', 'He refused to work'], 0],
        ['What did Vex do every evening?', ['Left fish for a wild dragon and waited quietly', 'Practiced sword fighting', 'Read in the library', 'Flew around the tower'], 0],
        ['What was special about the wild dragon?', ['It had the same stripe as Thunder', 'It was made of fire', 'It could talk', 'It was the Star Egg dragon'], 0],
        ['Why didn\'t Vex chase the dragon?', ['He wanted it to decide to trust him on its own', 'He was too tired', 'He was afraid of it', 'Master Oona said not to'], 0],
        ['What did Wren mean by "Like a crystal"?', ['Trust grows slowly and patiently, like Pebble\'s crystal', 'Vex was made of glass', 'The dragon was shiny', 'Vex was going to break'], 0]
      ] },
    { title: 'Breeze Chooses', emoji: '🌤️',
      text: `As the seasons turned, Breeze grew bigger, and the weather at Skyfire Academy became very interesting. When Breeze was happy, the sky was a perfect blue. When Breeze was grumpy, it drizzled. And once, when the cook ran out of Breeze's favorite honey cakes, it hailed for an entire afternoon.

Everyone wondered who Breeze would finally bond with. Older students tried to impress the young storm dragon. They showed off their best flying tricks. They brought presents. Breeze watched politely, but nothing happened.

Then, in early autumn, a new student arrived. Her name was Fen. She had traveled from a fishing village far across the sea, and she was smaller and quieter than anyone else in her class. She didn't have a dragon. She hadn't been chosen yet, and she spent most of her time alone, sketching clouds in a battered notebook.

Wren noticed her right away. She remembered what it felt like to be new, with a dragon who couldn't fly and no idea where she belonged. So Wren sat with Fen at lunch, and Pebble showed her how to make a stone glow, and Tobin taught her a terrible joke about a dragon who couldn't stop hiccupping.

One afternoon, a sudden storm swept over the academy. Thunder boomed. Rain hammered the windows. Everyone hurried inside, except for Fen, who was standing alone in the courtyard, her notebook clutched against her chest, staring up at the sky.

"Fen!" Wren shouted from the doorway. "Come inside!"

But Fen didn't move. "It's not an angry storm," she called back. "It's a lonely one. Can't you feel it?"

High above, a silver-blue shape spiraled down through the clouds. Breeze landed in the courtyard in front of Fen, sparks crackling along its scales, wind whipping its wings.

Fen didn't run. She didn't command. She simply held out her notebook and opened it. Every page was filled with drawings of clouds: fluffy ones, stormy ones, sunrise clouds painted in pink and gold.

"I draw the sky when I miss home," she said softly. "I think maybe you miss something too."

Breeze leaned forward and looked at the drawings for a long time. Then it pressed its forehead gently against Fen's.

Instantly, the rain stopped. The clouds peeled back, and a rainbow arched across the entire sky, brighter than any Wren had ever seen.

Master Oona appeared beside Wren in the doorway, smiling. "Of course," she murmured. "A storm dragon doesn't need someone powerful. It needs someone who understands storms."

Fen turned around, her face shining with joy, as Breeze curled its tail around her like a hug.

Wren felt the familiar warm hum in her hand. She looked down at Pebble, who was grinning from ear to ear.

"Remember when that was us?" he asked.

"I remember," said Wren. "And look at us now."`,
      qs: [
        ['How did Breeze\'s moods affect the academy?', ['They changed the weather', 'They changed the food', 'They moved the castle', 'They made dragons sleep'], 0],
        ['Why didn\'t the older students\' tricks work?', ['Breeze wasn\'t looking for someone who showed off', 'Breeze was asleep', 'The tricks were too easy', 'Breeze had already left'], 0],
        ['Why did Wren befriend Fen?', ['She remembered how it felt to be new and not belong', 'Master Oona ordered her to', 'Fen had a dragon', 'Fen was famous'], 0],
        ['What did Fen\'s notebook show?', ['Drawings of clouds and sky', 'Maps of the academy', 'Pictures of dragons', 'Recipes'], 0],
        ['What does Master Oona mean by "someone who understands storms"?', ['Someone who knows what it\'s like to feel lonely or stormy inside', 'A weather scientist', 'Someone who is very strong', 'Someone who is never sad'], 0]
      ] }
  ]
};
for (const [n, list] of Object.entries(DAUGHTER_EXTRA)) {
  DAUGHTER_TRACK.levels[n - 1].stories.push(...list);
}

/* ============================================================
   GIANNA — "The Sunny Day Club" friendship series (original).
   Four friends run a helper club from Rosie's treehouse:
   Rosie (big ideas), Priya (organized, keeps the club notebook),
   Jules (artist), and Lena (new girl, can fix anything).
   Neighbors: Mrs. Lee (dog Noodle, cat Pepper), Mr. Ortiz (garden),
   Mrs. Park (toddler twins Max and Mia).
   ============================================================ */
const DAUGHTER_CLUB = {
  1: [
    { title: 'The Club Begins', emoji: '🌻',
      text: `Rosie had a big idea. "Let's start a club!" she said. "We can help people on our street."

Priya and Jules said yes. They met in Rosie's tree house. Jules made a sign. It said, "The Sunny Day Club. We Help!"

They hung the sign on the gate. Then they sat and waited for their very first job.`,
      qs: [
        ['Whose idea was the club?', ['Rosie\'s', 'Priya\'s', 'Jules\'s', 'Mom\'s'], 0],
        ['What does the club want to do?', ['Help people on their street', 'Win a race', 'Bake cakes', 'Find a dragon'], 0],
        ['Where did they meet?', ['In Rosie\'s tree house', 'At school', 'At the park', 'In a barn'], 0],
        ['Who made the sign?', ['Jules', 'Rosie', 'Priya', 'Mrs. Lee'], 0],
        ['How do you think the girls felt as they waited?', ['Excited', 'Angry', 'Sleepy', 'Bored'], 0]
      ] },
    { title: 'Noodle Goes for a Walk', emoji: '🐕',
      text: `Mrs. Lee had a big dog named Noodle. "Can you walk him?" she asked. The club said yes!

Noodle saw a cat and ran. He pulled Rosie down the street. "Help!" she cried.

Priya and Jules grabbed the leash too. All three held on tight. Noodle stopped. "Next time," said Priya, "we all hold on from the start."`,
      qs: [
        ['What was the club\'s first job?', ['Walking a dog', 'Washing a car', 'Baking bread', 'Painting a fence'], 0],
        ['What is the dog\'s name?', ['Noodle', 'Pepper', 'Pebble', 'Max'], 0],
        ['Why did Noodle run?', ['He saw a cat', 'He was hungry', 'He heard a bell', 'It started raining'], 0],
        ['How did they stop Noodle?', ['All three held the leash', 'They gave him a treat', 'They yelled', 'They let him go'], 0],
        ['What did they learn?', ['Work together from the start', 'Dogs are bad', 'Never walk dogs', 'Run faster'], 0]
      ] }
  ],
  2: [
    { title: 'The New Girl', emoji: '📦',
      text: `A moving truck stopped on Maple Lane. A girl with two long braids climbed out. She sat on a box and looked at her feet.

"She looks lonely," said Jules. So the club walked over. "Hi! We're the Sunny Day Club," said Rosie. "Want to see our tree house?"

The girl's name was Lena. When she saw the tree house, she pointed at the wobbly ladder. "I can fix that," she said. And she did! Lena became the club's fourth member.`,
      qs: [
        ['What stopped on Maple Lane?', ['A moving truck', 'A bus', 'A fire truck', 'An ice cream truck'], 0],
        ['Why did the club go say hi?', ['The girl looked lonely', 'She called them', 'She had a dog', 'She was crying loudly'], 0],
        ['What is the new girl\'s name?', ['Lena', 'Rosie', 'Priya', 'Mia'], 0],
        ['What did Lena fix?', ['The wobbly ladder', 'A bike', 'A clock', 'The sign'], 0],
        ['What does this story show about the club?', ['They are kind to new people', 'They only want old friends', 'They are bossy', 'They don\'t like the tree house'], 0]
      ] },
    { title: 'Lemonade for the Library', emoji: '🍋',
      text: `The town library needed new books. The club wanted to help, so they made a lemonade stand.

Rosie squeezed the lemons. Priya counted the cups. Jules painted a bright yellow sign. Lena built a little table.

The first neighbor took a sip and made a sour face. "Oh no," said Priya. "We forgot the sugar!" They stirred in sugar and honey. Soon there was a long line. They raised twenty dollars for the library!`,
      qs: [
        ['Why did the club make a lemonade stand?', ['To help the library buy books', 'To buy toys', 'For a birthday', 'Because they were thirsty'], 0],
        ['What was Lena\'s job?', ['Building a table', 'Counting cups', 'Painting a sign', 'Squeezing lemons'], 0],
        ['Why did the first neighbor make a sour face?', ['They forgot the sugar', 'The cup was dirty', 'It was too cold', 'It had salt'], 0],
        ['How much money did they raise?', ['Twenty dollars', 'Five dollars', 'One hundred dollars', 'Nothing'], 0],
        ['What does "raised" mean in this story?', ['Collected money', 'Lifted up', 'Grew taller', 'Woke up'], 0]
      ] }
  ],
  3: [
    { title: 'Twin Trouble', emoji: '👶',
      text: `Mrs. Park worked at home, but she needed quiet time for an important phone call. "Could the club play with my twins for one hour?" she asked. "I'll be right in the next room."

The twins, Max and Mia, were three years old and very fast. The moment the club arrived, Max ran toward the kitchen and Mia ran toward the stairs.

"Wait!" Rosie called, but they didn't listen.

Priya thought quickly. "Let's play Follow the Leader!" she announced, marching in a silly circle and flapping her arms like a chicken.

Max and Mia stopped. They giggled. Then they lined up right behind her. For the rest of the hour, the twins happily followed the club around the playroom, hopping, tiptoeing, and quacking.

When Mrs. Park came back, she smiled. "How did you keep them together?"

"We just made it a game," said Priya.`,
      qs: [
        ['Why did Mrs. Park need help?', ['She had an important phone call', 'She was going on a trip', 'She was sick', 'She was at the store'], 0],
        ['How old were the twins?', ['Three', 'Five', 'One', 'Seven'], 0],
        ['What problem happened first?', ['The twins ran in different directions', 'The twins fell asleep', 'The power went out', 'The dog ran away'], 0],
        ['What was Priya\'s idea?', ['Play Follow the Leader', 'Read a book', 'Call Mrs. Park', 'Turn on the TV'], 0],
        ['What lesson did the club learn?', ['Turning things into a game can help', 'Yelling works best', 'Twins never listen', 'Hide from toddlers'], 0]
      ] },
    { title: 'The Missing Notebook', emoji: '📒',
      text: `Priya kept the club notebook. It had every job and every phone number. It had every dollar the club had made, too. She took it everywhere.

One Saturday, the notebook was gone. Priya looked in her backpack. She looked in her room and in the tree house. "Without it, we won't know which jobs we promised!" she cried.

Lena saw something on the tree house floor. It was a trail of pencil shavings in lots of colors. The trail led to the corner. Jules sat there drawing, with the notebook open on her lap.

"Jules!" said Priya. "That's our club notebook!"

Jules looked up. "I'm sorry! I ran out of paper, so I used the back pages."

Priya flipped to the back. Jules had drawn a pretty picture of all four friends in the tree house. Priya's frown slowly turned into a smile.

"Okay," she said. "But next time, ask first. And maybe we should get you a sketchbook."`,
      qs: [
        ['What was in the club notebook?', ['Jobs, phone numbers, and money earned', 'Only drawings', 'Recipes', 'Spelling words'], 0],
        ['Why was Priya so worried?', ['They wouldn\'t know which jobs they promised', 'It was expensive', 'It was her birthday present', 'Her mom would be mad'], 0],
        ['What clue did Lena find?', ['Colored pencil shavings', 'Muddy footprints', 'A feather', 'A note'], 0],
        ['Why did Jules use the notebook?', ['She ran out of paper', 'She wanted to hide it', 'She was angry', 'Priya asked her to'], 0],
        ['What is the lesson for Jules?', ['Ask before using someone else\'s things', 'Never draw', 'Hide your notebook', 'Always use pencils'], 0]
      ] }
  ],
  4: [
    { title: 'Two Jobs, One Saturday', emoji: '📅',
      text: `On Friday night, Priya opened the club notebook and gasped. "Uh-oh. We said we would walk Noodle at ten tomorrow."

"So?" asked Rosie.

"We ALSO said we would help Mr. Ortiz plant his garden at ten," Priya said. "We can't be in two places at once!"

Everyone was quiet. Then Lena said, "Maybe we can. There are four of us."

"Two people walk Noodle. Two people help Mr. Ortiz," Jules said.

"But Noodle is really strong," Rosie said. "Remember last time?"

"Then you and I take Noodle," said Priya. "We'll both hold the leash."

On Saturday, the plan worked. Rosie and Priya walked Noodle all the way around the park. Jules and Lena planted twenty tomato plants with Mr. Ortiz.

That night, Priya wrote a new rule in the notebook: "Check the calendar BEFORE saying yes."`,
      qs: [
        ['What problem did Priya find?', ['Two jobs at the same time', 'A lost dog', 'A broken tree house', 'No jobs at all'], 0],
        ['Who suggested splitting into two teams?', ['Jules', 'Rosie', 'Mr. Ortiz', 'Mrs. Lee'], 0],
        ['Why did Rosie worry about walking Noodle?', ['Noodle is really strong', 'She doesn\'t like dogs', 'It might rain', 'Noodle bites'], 0],
        ['How many tomato plants did they plant?', ['Twenty', 'Ten', 'Four', 'One hundred'], 0],
        ['What new rule did Priya make?', ['Check the calendar before saying yes', 'Only one job a month', 'No more dogs', 'Rosie decides everything'], 0]
      ] },
    { title: 'Jules Feels Left Out', emoji: '🎨',
      text: `At club meetings, Rosie always had the big ideas. Priya always had the plans. Lena could fix anything.

Jules just sat in the corner, quietly doodling. "What do I even do for the club?" she wondered sadly.

One day, she stopped coming to meetings. The others noticed right away.

"Where's Jules?" asked Lena. "Is she sick?"

They walked to her house and found her on the porch steps. "I'm not good at anything the club needs," Jules said softly.

Rosie looked surprised. "Jules, who made our sign? Who painted the lemonade stand? Everyone on Maple Lane knows about us because of your art!"

"You make people notice us," Priya added. "That's important."

Jules looked up. "Really?"

"Really," said Lena. "We need a Club Artist. It's an official job."

The next day, Jules designed bright new flyers. By Saturday, the club had three new jobs.`,
      qs: [
        ['How did Jules feel at the start?', ['Left out, like she didn\'t matter', 'Proud', 'Excited', 'Angry at Rosie'], 0],
        ['What did Jules do when she felt that way?', ['Stopped coming to meetings', 'Started yelling', 'Quit painting', 'Moved away'], 0],
        ['Which example shows Jules helped the club?', ['She made the sign and painted the stand', 'She walked Noodle', 'She fixed the ladder', 'She kept the notebook'], 0],
        ['What new job did they give Jules?', ['Club Artist', 'Club Boss', 'Dog Walker', 'Money Counter'], 0],
        ['What happened because of Jules\'s flyers?', ['The club got three new jobs', 'The club closed', 'It rained', 'Rosie got mad'], 0]
      ] }
  ],
  5: [
    { title: 'The Tomato Mystery', emoji: '🍅',
      text: `Mr. Ortiz's tomatoes were finally ripe and red. But every morning, a few more were missing. Some had bites taken out of them and were left on the ground.

"Can the Sunny Day Club solve this?" he asked.

Priya opened the notebook to a fresh page and wrote CLUES at the top. Clue one: the tomatoes disappeared at night. Clue two: there were small, hand-shaped prints in the dirt. Clue three: the lid of the trash can was knocked over.

"Hand-shaped prints and a messy trash can," said Lena slowly. "I think I know who it is."

That night, the girls had a stakeout. They sat by Rosie's window with flashlights and snacks. Just after nine o'clock, they saw them: a mother raccoon and three fuzzy babies, tiptoeing into the garden.

"They're so cute!" whispered Jules.

"They're also eating all the tomatoes," Rosie whispered back.

The next day, Lena helped Mr. Ortiz build a little fence with a gate that latched. Jules painted a sign that said "Raccoons, please use the other restaurant!" And Mr. Ortiz left a bowl of old vegetable scraps by the woods, far from the garden.

The tomatoes were safe. The raccoons still got dinner. Everyone was happy.`,
      qs: [
        ['What was happening to Mr. Ortiz\'s tomatoes?', ['They were disappearing at night', 'They turned blue', 'They wouldn\'t grow', 'They were too big'], 0],
        ['Which clue pointed to raccoons?', ['Hand-shaped prints and a knocked-over trash lid', 'Feathers', 'Hoof prints', 'Glitter'], 0],
        ['What is a "stakeout"?', ['Watching quietly to see what happens', 'A kind of fence', 'A cooking contest', 'A sleepover game'], 0],
        ['How did they protect the garden?', ['A fence with a gate that latched', 'A scary dog', 'Loud music', 'They picked all the tomatoes'], 0],
        ['Why did Mr. Ortiz leave scraps by the woods?', ['So the raccoons could still eat somewhere else', 'To trap them', 'To grow more tomatoes', 'To feed Noodle'], 0]
      ] },
    { title: 'The Big Argument', emoji: '⚡',
      text: `"We should take every job we can possibly get!" said Rosie, waving her arms. "That's how we'll become the most popular club in town."

"No," said Priya firmly. "If we take too many jobs, we'll do them badly. We should only accept the jobs we can do well."

"That's boring!"

"That's responsible!"

Their voices grew louder and louder until Jules covered her ears. Finally, Rosie stomped down the tree house ladder. "Maybe there shouldn't even BE a club!" she shouted.

The tree house was very quiet.

The next day, Lena knocked on Rosie's door, and then on Priya's. "Can we meet?" she asked. "Just for ten minutes."

When everyone was together, Lena handed each girl a piece of paper. "Write down what you think the other person is trying to say. Not what you believe. What THEY believe."

Rosie wrote: "Priya wants us to do excellent work so people will trust us."

Priya wrote: "Rosie wants the club to grow so we can help more people."

They read each other's papers and both started laughing. "We actually want the same thing," said Rosie, surprised.

Together they created a new plan: accept new jobs, but only one more each week. And they agreed that nobody would ever say "no club" again.`,
      qs: [
        ['What did Rosie want?', ['To take every job they could get', 'To close the club', 'To only take one job', 'To make Priya the boss'], 0],
        ['What did Priya want?', ['Only jobs they could do well', 'Every job possible', 'No jobs at all', 'To buy a new notebook'], 0],
        ['What does "responsible" mean here?', ['Doing what you promise, and doing it well', 'Being loud', 'Being the fastest', 'Having fun only'], 0],
        ['What did Lena ask them to write?', ['What the other person was trying to say', 'A list of jobs', 'An apology letter', 'A new club name'], 0],
        ['What did they discover?', ['They wanted the same thing', 'They should quit', 'Lena should be the boss', 'Jules was right all along'], 0]
      ] }
  ],
  6: [
    { title: 'Lena\'s Secret Worry', emoji: '💌',
      text: `For a whole week, Lena was quiet. She stopped fixing things. She didn't laugh at Jules's jokes. When Priya asked what was wrong, Lena just shrugged and said, "Nothing."

But the club could tell it wasn't nothing.

Finally, Rosie gently asked again. This time, Lena's eyes filled with tears. "My mom might get a new job in another state," she whispered. "We've moved four times already. Every time I make friends, I have to say goodbye."

The tree house was silent. Jules reached over and squeezed Lena's hand.

"We don't know what will happen yet," Priya said carefully. "But whatever happens, you'll always be part of the Sunny Day Club."

That night, the other three girls had a secret meeting. They decided to make Lena something special: a memory book. Jules drew pictures of every job they had done together. Priya wrote down funny moments, like the day Noodle dragged Rosie down the street. Rosie collected a leaf from the tree house tree and pressed it between two pages.

On Friday, they gave Lena the book. She turned the pages slowly, laughing and crying at the same time.

Then her phone buzzed. It was a message from her mom. Lena read it, and her face lit up like the sun.

"Mom decided to stay!" she shouted. "We're not moving!"

The club cheered so loudly that Noodle started barking three houses away.

Lena hugged the memory book to her chest. "I'm keeping this forever anyway," she said. "Because now I know what real friends look like."`,
      qs: [
        ['How did the club know something was wrong with Lena?', ['She was quiet and stopped fixing things', 'She told everyone right away', 'She was yelling', 'She stopped coming to school'], 0],
        ['What was Lena worried about?', ['Moving away again', 'A test at school', 'Her lost dog', 'A broken tool'], 0],
        ['What did the club make for Lena?', ['A memory book', 'A cake', 'A new tree house', 'A painting of a dragon'], 0],
        ['What does it mean that Lena was "laughing and crying at the same time"?', ['She felt happy and emotional together', 'She was confused', 'She was hurt', 'She was being silly'], 0],
        ['Why does Lena keep the book even though she isn\'t moving?', ['It shows her what real friends look like', 'She has to return it', 'It\'s valuable money', 'Her mom told her to'], 0]
      ] },
    { title: 'Rain on the Neighborhood Fair', emoji: '☔',
      text: `Every summer, Maple Lane held a Neighborhood Fair. This year, the Sunny Day Club was in charge of the kids' corner. They had planned for weeks.

Lena built a beanbag toss. Jules painted faces. Priya made a schedule so everything ran on time. Rosie was in charge of the biggest event: a three-legged race.

The morning of the fair was bright and sunny. But at noon, dark clouds rolled in. Then came thunder. Then came rain, pouring down in buckets.

Families grabbed their things and ran for cover. The kids in the line for face painting looked like they might cry.

"The whole fair is ruined," Rosie groaned.

Priya was already flipping through the notebook. "Not ruined. Just moved. Mr. Ortiz said we could use his garage if we ever needed it."

The girls sprang into action. Lena and Rosie carried the beanbag toss. Jules wrapped her paint set in a plastic bag. Priya ran ahead to open the garage door.

Within fifteen minutes, the kids' corner was back in business. The garage was crowded and cozy. Rain drummed on the roof like a drum band. Jules painted lightning bolts on everyone's cheeks, because it seemed appropriate.

Rosie even changed the three-legged race into a three-legged dance contest, since there wasn't room to run.

At the end of the day, Mr. Ortiz said it was the best fair in years. "Anyone can plan a party for sunny weather," he said. "It takes a real team to save one in a storm."`,
      qs: [
        ['What was the club in charge of at the fair?', ['The kids\' corner', 'The food tables', 'The music', 'Parking'], 0],
        ['What went wrong?', ['A thunderstorm started', 'Nobody came', 'Lena got hurt', 'The paint spilled'], 0],
        ['Where did they move the kids\' corner?', ['Mr. Ortiz\'s garage', 'The library', 'The tree house', 'A tent'], 0],
        ['Why did Rosie change the race into a dance contest?', ['There wasn\'t room to run', 'Nobody wanted to race', 'It was too hot', 'She lost the ropes'], 0],
        ['What did Mr. Ortiz mean about a "real team"?', ['A good team can solve problems when plans go wrong', 'Teams only work when it\'s sunny', 'Storms ruin everything', 'Parties should be indoors'], 0]
      ] }
  ],
  7: [
    { title: 'The Search for Pepper', emoji: '🐈‍⬛',
      text: `Mrs. Lee knocked anxiously on the tree house ladder, looking absolutely frantic. "Pepper is missing!" she said. Pepper was her small black cat, with one white paw like a sock. "She slipped out last night, and she has never been gone this long."

The club organized a search immediately.

Jules made posters with a drawing of Pepper, so neighbors would know exactly what she looked like. Priya pulled out a map of Maple Lane and drew a grid of squares across it. "If we search one square at a time," she explained, "we won't miss anywhere, and we won't search the same place twice."

Lena packed a flashlight, a can of cat food, and a spoon. "Cats come when they hear a spoon tapping on a can," she said. "My grandma taught me that."

Rosie knocked on every single door, politely asking neighbors to investigate their sheds, porches, and garages.

They searched square after square, examining the ground underneath bushes and behind fences. Hours passed, the sun began to set, and the girls grew exhausted and worried.

"Maybe she's gone for good," Jules said quietly.

"Not yet," said Priya, tapping the map. "We still have one square left."

The last square was the Johnsons' house. The Johnsons had been cleaning out their garage that week, and there were stacks of cardboard boxes everywhere.

Lena knelt down in front of the boxes and tapped the spoon on the can. Tink, tink, tink.

At first, there was nothing but silence. Then they heard a tiny, muffled sound: "Mew."

The girls froze, hardly daring to breathe. Tink, tink, tink. "Mew!" It was coming from inside a box labeled HOLIDAY DECORATIONS.

Rosie carefully opened the flaps. There, curled up in a nest of tinsel, was Pepper, blinking at them sleepily. She must have wandered into the open garage and gotten closed in when the Johnsons shut the door.

When they carried Pepper home, Mrs. Lee burst into grateful tears and hugged each girl individually.

That night, Priya added a new page to the club notebook. At the top, she wrote, "Lost Pet Plan," and listed every step they had used. "Just in case," she said, "someone else ever needs us."`,
      qs: [
        ['What did Pepper look like?', ['A small black cat with one white paw', 'A big orange cat', 'A white dog', 'A gray kitten with stripes'], 0],
        ['Why did Priya draw a grid on the map?', ['So they would search everywhere without repeating', 'To play a game', 'To find buried treasure', 'To draw Pepper'], 0],
        ['What trick did Lena\'s grandma teach her?', ['Tapping a spoon on a can of cat food', 'Whistling loudly', 'Leaving out milk', 'Calling the cat\'s name softly'], 0],
        ['Where was Pepper found?', ['In a box of holiday decorations in a garage', 'Up a tree', 'Under Mrs. Lee\'s bed', 'At the park'], 0],
        ['Why did Priya write a "Lost Pet Plan"?', ['So the club can help again if another pet goes missing', 'Because Mrs. Lee asked for it', 'To sell it', 'For a school project'], 0]
      ] },
    { title: 'Rosie Takes Charge (Too Much)', emoji: '📣',
      text: `After the success of the fair and the search for Pepper, the Sunny Day Club became famous on Maple Lane. Everyone wanted to hire them. And Rosie, who had started the club, began to feel very important.

"Priya, you'll walk Noodle on Monday," she announced at the next meeting. "Jules, make twenty new flyers by tomorrow. Lena, fix Mrs. Park's fence on Wednesday. I'll handle the important phone calls."

The others looked at each other. Nobody said anything.

The next week, Rosie gave even more orders. She changed Jules's flyer colors without asking. She told Priya she was writing in the notebook "too slowly." When Lena suggested a new idea, Rosie said, "No, my way is better," without even listening.

On Saturday, Rosie climbed into the tree house for the meeting. It was empty. On the floor was a note in Priya's neat handwriting:

"Rosie, we're taking a break from the club. It doesn't feel like OUR club anymore. It feels like yours."

Rosie sat down hard. Her cheeks burned. At first, she felt angry. Didn't they know she was the leader? But as she sat alone, she started to remember. She remembered Jules's sign, Priya's grid map, and Lena's spoon trick. The club's best moments hadn't come from her orders. They had come from everyone's ideas.

Rosie took out a pen and wrote three letters, one for each friend. Each letter said the same thing at the end: "I'm sorry. I forgot that a leader is supposed to listen."

The next day, all four girls sat in the tree house together. Rosie had a new idea, but this time it was a different kind of idea.

"From now on, we vote," she said. "Every big decision. Everyone gets one vote, including me."

"And everyone gets a turn to lead a job," Priya added.

They voted on it right then. The vote was four to zero.`,
      qs: [
        ['Why did Rosie start feeling very important?', ['The club became famous and she had started it', 'She won a prize', 'She was the oldest', 'Her mom said so'], 0],
        ['Which is an example of Rosie being bossy?', ['Changing Jules\'s flyer colors without asking', 'Fixing a fence', 'Walking Noodle', 'Writing in the notebook'], 0],
        ['What did Rosie find in the empty tree house?', ['A note saying the others were taking a break', 'A new sign', 'Pepper the cat', 'A birthday cake'], 0],
        ['What did Rosie realize about the club\'s best moments?', ['They came from everyone\'s ideas', 'They came only from her orders', 'They were just luck', 'They never happened'], 0],
        ['What does "a leader is supposed to listen" mean?', ['Good leaders care about everyone\'s ideas', 'Leaders should be quiet', 'Leaders never talk', 'Leaders follow orders'], 0]
      ] }
  ],
  8: [
    { title: 'One Year of Sunshine', emoji: '🎉',
      text: `It had been exactly one year since Jules painted the very first sign: "The Sunny Day Club. We Help!" The paint had faded a little in the sun and rain, but it still hung proudly on the gate.

To celebrate the anniversary, the girls climbed into the tree house with a box of cupcakes and the club notebook, and Priya opened it to the very first page.

"Job number one," she read. "Walk Noodle." Everyone groaned and laughed simultaneously. Rosie rubbed her elbow, remembering how Noodle had dragged her down the street.

They kept reading. The lemonade stand that raised twenty dollars for the library. The day Max and Mia ran in two directions at once. The raccoon family in Mr. Ortiz's garden. The thunderstorm fair. The search for Pepper. They even read about the week the club almost fell apart, twice.

"Do you know how many jobs we've completed?" Priya asked, since she had carefully counted them. "Eighty-seven."

"Eighty-seven!" Jules gasped. "That's a lot of helping."

Just then, they heard voices outside, dozens of them, so the girls peeked curiously out the window and stared in amazement.

All of Maple Lane was standing in Rosie's backyard. Mrs. Lee was there with Noodle and Pepper. Mr. Ortiz held a basket of tomatoes. Mrs. Park stood with the twins, who were now four and holding a giant banner. Even the Johnsons had come, and the librarian from the town library.

The banner said: "THANK YOU, SUNNY DAY CLUB!"

The girls climbed down the ladder, too astonished to say anything. Mrs. Lee stepped forward. "For a whole year," she said, "you four have helped every single one of us. Today, we wanted to help you."

The neighbors had constructed something mysterious and hidden it under a sheet beside the tree, and Mr. Ortiz dramatically pulled the sheet away. It was a beautiful wooden bench, painted bright yellow, with four names carved into the back: ROSIE, PRIYA, JULES, LENA.

"For club meetings when the tree house gets too crowded," said Mr. Ortiz with a wink.

That evening, after everyone had gone home, the four friends sat on their new bench and watched the sun go down.

"Do you remember why we started this club?" Rosie asked.

"To help people," said Priya.

"I think it helped us too," said Lena quietly. "When my family moved here, I had absolutely no friends, and now I have three wonderful best friends."

Jules didn't say anything; she simply pulled out her sketchbook and began to draw the four of them, sitting together on the yellow bench, in the very last light of a sunny day.`,
      qs: [
        ['What were the girls celebrating?', ['The club\'s one-year anniversary', 'Rosie\'s birthday', 'The end of school', 'A new member'], 0],
        ['How many jobs had the club done?', ['Eighty-seven', 'Twenty', 'One hundred', 'Twelve'], 0],
        ['What did the neighbors give the club?', ['A yellow bench with their names carved in it', 'A new tree house', 'Money', 'A puppy'], 0],
        ['What did Lena mean by "I think it helped us too"?', ['The club gave the girls friendship', 'The neighbors paid them a lot', 'They got stronger', 'They learned to paint'], 0],
        ['Why do you think the neighbors all came together?', ['To thank the club for a year of help', 'Because Mrs. Lee lost Noodle', 'For a fair', 'Because of a storm'], 0]
      ] },
    { title: 'The Littlest Member', emoji: '🌱',
      text: `Rosie's little sister, Daisy, was five years old, and she followed the club everywhere. She waited patiently at the bottom of the tree house ladder during meetings, and she trailed behind them on every dog walk. She drew her own Sunny Day Club signs in crayon and taped them to her bedroom door.

"Can I join?" she asked for the hundredth time.

"You're too little," Rosie said, for the hundredth time. "Club jobs are hard work."

Daisy's lip trembled with disappointment, and she walked away without saying a word.

Priya watched her go. "Rosie," she said slowly, "how old were we when we started wanting to help people?"

Rosie considered the question thoughtfully. "I don't remember exactly. Pretty little, I guess."

"Maybe being little doesn't mean you can't help," said Lena. "It just means you help in a different way."

The club called a vote, the way they had promised to do for every big decision. They discussed which responsibilities Daisy could handle safely. She couldn't walk Noodle; he was bigger than she was. She couldn't use Lena's tools. But she could water Mr. Ortiz's plants with a small watering can. She could help Jules color in flyers. She could play with Max and Mia, who were almost her age.

The vote was four to zero, again.

That evening, Rosie knocked gently on Daisy's bedroom door, where Daisy was lying on her bed, still feeling miserable.

"Daisy," Rosie said, "the Sunny Day Club has a new program. It's called the Sunny Sprouts. It's for helpers who are still growing. And we need a first member."

Daisy sat straight up. "Me?"

"You," said Rosie. She held out a small yellow badge that Jules had made. It had a tiny green sprout painted on it.

Daisy pinned it proudly to her shirt and raced to the mirror, and then she ran back and threw her arms around her big sister.

On Saturday, Daisy watered every one of Mr. Ortiz's tomato plants, very carefully, one at a time. When she had finished, Mr. Ortiz shook her hand respectfully, just like a grown-up. "Excellent work, Sprout," he said.

Daisy beamed so brightly that, for a moment, Rosie thought she looked exactly like the club's very first sign.

That night, Priya opened the club notebook and wrote a new heading: "Members." Under it, she carefully added a fifth name.`,
      qs: [
        ['Why did Rosie keep saying no to Daisy at first?', ['She thought Daisy was too little', 'Daisy was mean', 'The club was full', 'Daisy didn\'t want to help'], 0],
        ['What did Lena say about being little?', ['You can help in a different way', 'Little kids can\'t help', 'Little kids should wait', 'Little kids are bossy'], 0],
        ['How did the club decide to let Daisy join?', ['They voted, four to zero', 'Rosie decided alone', 'Mom told them to', 'Daisy won a contest'], 0],
        ['What is the Sunny Sprouts?', ['A program for young helpers', 'A garden', 'A kind of flower', 'A new club name'], 0],
        ['How has Rosie changed since "Rosie Takes Charge"?', ['She listens and lets the group vote', 'She is bossier', 'She left the club', 'She stopped helping'], 0]
      ] }
  ]
};

DAUGHTER_TRACK.series = { quest: { name: 'Dragon Academy', emoji: '🐉' }, club: { name: 'The Sunny Day Club', emoji: '🌻' } };
DAUGHTER_TRACK.levels.forEach(L => L.stories.forEach(s => { s.series = s.series || 'quest'; }));
for (const [n, list] of Object.entries(DAUGHTER_CLUB)) {
  list.forEach(s => s.series = 'club');
  DAUGHTER_TRACK.levels[n - 1].stories.push(...list);
}

// Legendary dragons: [emoji, name, type, level they unlock at]
DAUGHTER_TRACK.rewards.push(
  ['🌟','Starfire','legendary star',4], ['🌈','Aurora','legendary rainbow',5], ['💎','Diamondheart','legendary crystal',6],
  ['☄️','Cometwing','legendary comet',7], ['🌌','Celestia','legendary galaxy',8]
);

/* ============================================================
   GIANNA — chapter book: "The Lighthouse on Gull Island" (original).
   A Sunny Day Club summer mystery in 8 chapters. Lena's grandma, Nana June,
   lives by the sea; an old lighthouse starts blinking a secret signal.
   Shelved as a chapter book (see BOOK_DEFS), not in the rank story lists.
   ============================================================ */
const LIGHTHOUSE_BOOK = [
  { title: 'A Summer Surprise', emoji: '🌊', series: 'club',
    text: `On the last day of school, Lena ran up the tree house ladder waving a letter. "Guess what? My Nana June invited the whole Sunny Day Club to stay with her for a week. She lives right by the sea!"

Rosie squealed. Priya opened the club notebook and started a packing list. Jules was already drawing waves in the margin.

Three weeks later, the four friends climbed out of Lena's mom's car in a little town called Gull Harbor. The air smelled like salt and sunscreen. Seagulls cried over the docks, and fishing boats bobbed in the water like toys in a bathtub.

Nana June's cottage was small and blue, with a porch that creaked when you stepped on it. Nana June herself was tall and tan, with a long silver braid and a laugh that made everyone want to laugh too.

"Welcome, sunshine club!" she said, hugging each of them. "Your beds are in the attic. And from the attic window, you get the best view in town."

The girls raced upstairs. Through the round attic window, they could see the whole harbor. Out past the boats, on a rocky little island, stood a tall white lighthouse with a red stripe around its middle.

"That's Gull Island Lighthouse," Nana June said from the doorway. "It guided ships for a hundred years. But it has been closed and dark for thirty years now. Nobody goes out there anymore."

Jules pressed her nose to the glass. "It looks lonely," she said.

"It does," Nana June agreed softly. For a moment she looked far away, as if she were remembering something. Then she clapped her hands. "Who wants fish tacos?"

That night, the girls fell asleep to the sound of waves. None of them knew that their quiet seaside vacation was about to turn into the biggest mystery the Sunny Day Club had ever solved.`,
    qs: [
      ['Who invited the club to the sea?', ['Lena\'s Nana June', 'Mrs. Lee', 'Mr. Ortiz', 'Rosie\'s mom'], 0],
      ['What is the name of the town?', ['Gull Harbor', 'Maple Lane', 'Skyfire', 'Sandy Point'], 0],
      ['What could the girls see from the attic window?', ['A lighthouse on an island', 'A castle', 'A big city', 'A volcano'], 0],
      ['How long has the lighthouse been closed?', ['Thirty years', 'Three days', 'One year', 'A hundred years'], 0],
      ['Why do you think Nana June "looked far away"?', ['She was remembering something about the lighthouse', 'She was sleepy', 'She was looking for her glasses', 'She was angry'], 0]
    ] },
  { title: 'The Light in the Night', emoji: '💡', series: 'club',
    text: `Jules couldn't sleep. The attic was warm, and the moon was so bright that it painted a white square on the floor. She tiptoed to the round window with her sketchbook, hoping to draw the harbor at night.

That's when she saw it.

Out on Gull Island, at the very top of the dark lighthouse, a light flashed. Then it flashed again. Jules rubbed her eyes. The light blinked three quick times, then three long times, then stopped.

"Rosie," Jules whispered, shaking her friend's shoulder. "Priya! Lena! Wake up. The lighthouse is blinking!"

The girls crowded around the window in their pajamas. For a long minute, nothing happened. Rosie yawned. "Maybe you dreamed it."

Then the light came again. Blink, blink, blink. Blink... blink... blink.

"Three short and three long," Priya said, grabbing the club notebook and her flashlight. She wrote it down carefully, with the time: 11:42 at night.

"But Nana said nobody goes out there," Lena whispered. "It's been dark for thirty years."

"Then who is turning on the light?" asked Rosie.

The light didn't come again that night, even though they watched until their eyes drooped. At breakfast, they told Nana June everything. She was flipping pancakes, and when Jules described the pattern, three short and three long, the spatula slipped right out of her hand and clattered onto the stove.

"Are you sure?" Nana June asked quietly. "Exactly that pattern?"

Priya showed her the notebook. Nana June stared at the page for a long time. Then she picked up the spatula and smiled, but it was a puzzled kind of smile.

"Well," she said, "it must be a boat's light, reflecting off the old glass. Eat up, girls. The pancakes are getting cold."

But after breakfast, Lena pulled her friends aside. "Nana always tells the truth," she said. "But I don't think she told us everything."`,
    qs: [
      ['Why was Jules at the window?', ['She couldn\'t sleep and wanted to draw', 'She heard a noise', 'Rosie woke her up', 'She was looking for a boat'], 0],
      ['What pattern did the light make?', ['Three short, then three long', 'One long flash', 'Five quick flashes', 'It stayed on all night'], 0],
      ['What did Priya write in the notebook?', ['The pattern and the time', 'A grocery list', 'A poem', 'A map'], 0],
      ['What happened when Nana June heard about the pattern?', ['She dropped the spatula', 'She laughed loudly', 'She called the police', 'She went back to bed'], 0],
      ['Why does Lena think Nana didn\'t tell them everything?', ['Nana seemed surprised and puzzled by the pattern', 'Nana was angry', 'Nana said she was tired', 'Nana forgot their names'], 0]
    ] },
  { title: 'Clues at the Harbor', emoji: '⚓', series: 'club',
    text: `"Every good mystery starts with clues," Priya announced, opening the notebook to a fresh page. "Let's go to the harbor and ask questions."

The docks were busy with fishermen unloading their morning catch. An old man with a white beard was coiling a rope beside a green boat called the Sea Biscuit.

"Excuse me," said Rosie politely. "Do you know anything about the lighthouse on Gull Island?"

The man looked up. "Name's Mr. Baptiste. I've fished these waters for fifty years. That lighthouse has been locked tight since the last keeper moved away. His name was Walt Harper. Kind man. Had a son about your age, once." He chuckled. "Well, that son would be a grandpa now."

"Has anyone been out there lately?" asked Priya, pencil ready.

Mr. Baptiste scratched his beard. "Funny you ask. A few days ago, I saw a little rowboat tied up at the island's dock. Thought maybe someone was fishing off the rocks."

Priya wrote quickly. Clue one: the light. Clue two: a rowboat at the island.

Lena wandered to the end of the dock, where the rowboats were tied. She knelt down. "Look at this," she called. In the soft mud at the edge of the water were footprints. Small ones, only a little bigger than their own sneakers. Next to them was a crumpled paper bag from Gull Harbor Bakery.

"Kid-sized footprints," Jules said, sketching them. "And somebody likes cinnamon rolls."

Priya added clue three and clue four. Then she frowned. "We have clues, but no answers."

Rosie was staring across the water at the lighthouse. "We could row out there ourselves and look."

"Absolutely not," said Priya and Lena at the same time.

"The water is deep, and the tide is strong," Lena added. "We'd need a grown-up."

Rosie sighed. "Fine. But I bet the answer is out on that island."

As they walked back up the hill, nobody noticed a boy in a yellow raincoat watching them from behind a stack of lobster traps.`,
    qs: [
      ['Who is Mr. Baptiste?', ['A fisherman who has fished there for fifty years', 'The lighthouse keeper', 'Nana June\'s brother', 'A baker'], 0],
      ['Who was the last lighthouse keeper?', ['Walt Harper', 'Mr. Ortiz', 'Mr. Baptiste', 'Sam Harper'], 0],
      ['What did Lena find at the end of the dock?', ['Kid-sized footprints and a bakery bag', 'A key', 'A treasure map', 'A flashlight'], 0],
      ['Why wouldn\'t Priya and Lena row out to the island?', ['The water is deep and they need a grown-up', 'They were scared of seagulls', 'They had no time', 'The boat was broken'], 0],
      ['What do you think the boy in the yellow raincoat has to do with the mystery?', ['He might be the one making the footprints and the light', 'He is a fisherman', 'He is lost', 'He is Rosie\'s brother'], 0]
    ] },
  { title: "Nana June's Old Journal", emoji: '📔', series: 'club',
    text: `The next day, rain drummed on the cottage roof, so the girls stayed inside. Nana June asked them to help clean out a closet, and Jules found an old wooden box tucked behind some winter coats.

Inside the box were shells, a faded ribbon, a tiny brass compass, and a journal with a cracked leather cover. On the first page, in neat handwriting, it said: "June Lewis, age 10. PRIVATE!"

"Nana's last name used to be Lewis," Lena said. "This is her journal from when she was a kid!"

The girls looked at each other. "We shouldn't read it without asking," said Priya.

So they carried the box to the kitchen. Nana June was making soup. When she saw the journal, she put down her spoon and sat at the table. "Oh my," she said softly. "I haven't seen this in a very long time." She opened it carefully and began to read aloud.

"July 3rd. Walt showed me the lighthouse lamp today. It is as big as a car! His dad is the keeper, so Walt knows every one of the 112 stairs."

"Walt Harper!" Rosie gasped. "Mr. Baptiste told us about him!"

Nana June smiled and turned the page. "July 9th. Walt and I made up a secret signal. When he wants to meet me at the beach, he flashes his lantern from the top of the lighthouse. Three short flashes and three long flashes means MEET ME. I answer from my window with my flashlight."

The kitchen went completely silent. Rain pattered against the window.

"Three short and three long," Jules whispered. "That's the signal we saw!"

Nana June's eyes were shining. "Walt and his family moved away when we were twelve. We wrote letters for a while, but then we lost touch. Nobody else in the world knew that signal. Nobody but Walt and me."

"Then who is flashing it now?" asked Lena.

Nana June closed the journal and held it to her heart. "I don't know," she said. "But I think it's time we found out. Tomorrow morning, if the rain stops, we're going to Gull Island."`,
    qs: [
      ['Where did Jules find the old box?', ['In a closet behind winter coats', 'In the attic', 'At the beach', 'Under the porch'], 0],
      ['Why did the girls bring the journal to Nana instead of reading it?', ['It was private and they wanted to ask first', 'They couldn\'t open it', 'It was too heavy', 'They didn\'t like reading'], 0],
      ['What did the secret signal mean?', ['Meet me', 'Help', 'Good night', 'Go away'], 0],
      ['Who made up the signal with June?', ['Walt', 'Mr. Baptiste', 'Lena', 'Jules'], 0],
      ['Why is the signal such an important clue?', ['Only Walt and June ever knew it', 'It is written on the lighthouse', 'Every sailor uses it', 'It was in the newspaper'], 0]
    ] },
  { title: 'Across the Water', emoji: '🚣', series: 'club',
    text: `The rain stopped in the night, and the morning sky was so blue it almost hurt to look at. Nana June called Mr. Baptiste, and by nine o'clock they were all wearing orange life jackets on the deck of the Sea Biscuit.

The little boat chugged across the harbor. Waves splashed against the sides, and Rosie laughed every time salty spray hit her face. Jules held her sketchbook inside her jacket to keep it dry. Priya counted seagulls. Lena held Nana June's hand.

Up close, the lighthouse was enormous. Its white paint was peeling, and the red stripe had faded to pink. Mr. Baptiste tied the boat to the island's rickety dock, right next to a small blue rowboat.

"That's the rowboat I saw," he said.

A narrow path led up the rocks to the lighthouse door. Nana June walked slowly, touching the rough stones as if saying hello to an old friend. When they reached the door, Priya pointed at the lock. It was old and rusty, but it was hanging open.

"Someone has been here," Priya whispered.

Nana June pushed the door. It swung inward with a long, low creak. Inside, a spiral staircase twisted up into the shadows like the inside of a seashell.

"112 stairs," Nana June said. "I counted them with Walt once."

They climbed and climbed. Rosie's legs burned. Lena counted out loud. At the very top, they stepped into a round glass room filled with light. In the center stood the giant old lamp, wrapped in thick glass rings. And on a small table by the window, someone had left a sleeping bag, a stack of library books about lighthouses, a big silver flashlight, and a brass telescope.

Jules peeked through the telescope. Then she gasped. "It's pointed right at Nana June's cottage! I can see our attic window!"

Next to the telescope was a folded note. On the front, in messy handwriting, it said: "J.L."

Nana June's hand trembled as she reached for it. "J.L.," she whispered. "June Lewis. That's me."`,
    qs: [
      ['How did they get to Gull Island?', ['On Mr. Baptiste\'s boat, the Sea Biscuit', 'They swam', 'In the blue rowboat', 'On a bridge'], 0],
      ['What did Priya notice about the lock?', ['It was hanging open', 'It was brand new', 'It was missing', 'It was painted red'], 0],
      ['What does "enormous" mean in this chapter?', ['Very, very big', 'Very old', 'Very loud', 'Very small'], 0],
      ['What was the telescope pointed at?', ['Nana June\'s cottage', 'The moon', 'A ship', 'The bakery'], 0],
      ['Why did Nana June\'s hand tremble?', ['The note had her old initials on it', 'She was cold', 'She was scared of heights', 'She was tired from the stairs'], 0]
    ] },
  { title: "The Keeper's Grandson", emoji: '🧒', series: 'club',
    text: `Before Nana June could open the note, footsteps clanged on the stairs below. Everyone froze. A boy in a yellow raincoat appeared at the top, carrying a bakery bag. When he saw them, he dropped it, and a cinnamon roll rolled across the floor.

"The boy from the harbor!" Rosie exclaimed.

"Please don't be mad," the boy said quickly. "I'm allowed to be here. My mom is fixing up the lighthouse. She's going to turn it into a museum. I'm Sam. Sam Harper."

"Harper," Nana June repeated. "Are you related to Walt Harper?"

Sam's eyes went wide. "He's my grandpa! Wait, are you June? June Lewis?"

Nana June nodded, too surprised to speak.

Sam grinned so big his whole face changed. "I can't believe it! My grandpa tells stories about you all the time. About the secret signal, and the beach, and how you found a message in a bottle together."

He explained everything. His mom had found Grandpa Walt's old keeper's journal while cleaning the lighthouse. In it, Walt had written about the signal and about his best friend June. "Grandpa always wondered what happened to you," Sam said. "He lives three hours away now, and his eyes aren't good enough to drive. So when we came here this summer, I had an idea. If you still lived nearby, maybe you'd see the signal and remember."

"So you flashed it every night," Priya said, checking her notes. "That explains the light, the rowboat, and the footprints."

"And the cinnamon rolls," Jules added, picking up the roll from the floor.

Sam blushed. "I wrote the note in case you ever came. I didn't think anyone would really answer."

Nana June finally unfolded the note and read it aloud: "Dear J.L., if you can read this, my grandpa Walt still remembers you. He would love to hear from you. Please answer the signal. From, Sam."

For a moment, nobody said a word. Then Nana June laughed, and two happy tears rolled down her cheeks.

"Sam," she said, "I think we have a signal to answer."`,
    qs: [
      ['Who was the boy in the yellow raincoat?', ['Sam Harper, Walt\'s grandson', 'Mr. Baptiste\'s son', 'A lost tourist', 'Lena\'s cousin'], 0],
      ['Why is Sam\'s mom fixing the lighthouse?', ['To turn it into a museum', 'To live there', 'To sell it', 'To knock it down'], 0],
      ['Why was Sam flashing the signal every night?', ['He hoped June would see it and remember his grandpa', 'He was calling for help', 'He was playing a game with his mom', 'He wanted to scare people'], 0],
      ['Which clues did Sam\'s story explain?', ['The light, the rowboat, the footprints, and the bakery bag', 'Only the light', 'Only the footprints', 'None of them'], 0],
      ['How did Nana June feel at the end of the chapter?', ['Happy and emotional', 'Angry', 'Bored', 'Scared'], 0]
    ] },
  { title: 'Answering the Signal', emoji: '🔦', series: 'club',
    text: `That evening, the whole Sunny Day Club sat in the attic with Nana June, watching the sun sink into the sea. The sky turned orange, then pink, then deep purple. One by one, the stars came out.

Nana June held an old silver flashlight, the very same one from the wooden box. Lena had put in fresh batteries.

"Sam said he'd watch for us at nine o'clock," Priya said, checking her watch. "It's 8:59."

Everyone held their breath. Out on Gull Island, the top of the lighthouse was dark. Then, right at nine, a light blinked. Three short. Three long.

Nana June lifted her flashlight to the round window. Her hands shook a little. Click, click, click. Click... click... click.

For a long moment, the lighthouse stayed dark. Rosie squeezed Jules's hand.

Then the light on the island went wild. It blinked and flashed and swooped in circles, like a lighthouse doing a happy dance. The girls cheered so loudly that a seagull on the roof squawked and flew away.

A minute later, the cottage phone rang. Nana June answered it. "Hello?"

The girls could hear an old man's voice through the phone, shaky but warm. "June? June Lewis? Is it really you? It's Walt."

Nana June sat down slowly on the attic bed. "Hello, Walt," she said, and her voice wobbled. "It's really me. You still flash a signal like a show-off."

On the other end of the phone, Walt laughed, a big laugh that sounded just like Sam's.

The girls tiptoed downstairs to give Nana June some privacy. They could hear her laughing and talking for almost an hour.

When she finally came down, her cheeks were pink. "Walt is coming to Gull Harbor," she announced. "Sam's mom will drive him here on Saturday. That's the day the lighthouse museum opens."

"That's only four days away," said Priya, already flipping to a new page in the notebook. "And I have a feeling the museum could use some help from the Sunny Day Club."`,
    qs: [
      ['What time did Sam say he would watch for the signal?', ['Nine o\'clock', 'Noon', 'Midnight', 'Six o\'clock'], 0],
      ['What did Nana June use to answer the signal?', ['Her old silver flashlight', 'A candle', 'A mirror', 'A lantern from the store'], 0],
      ['How did the lighthouse react when June answered?', ['It blinked and flashed like a happy dance', 'It went dark forever', 'It flashed one time', 'It turned red'], 0],
      ['Who called on the phone?', ['Walt', 'Mr. Baptiste', 'Lena\'s mom', 'Mrs. Lee'], 0],
      ['Why did the girls go downstairs during the call?', ['To give Nana June privacy', 'Because they were hungry', 'Because it was bedtime', 'To find Sam'], 0]
    ] },
  { title: 'The Lighthouse Shines Again', emoji: '🗼', series: 'club',
    text: `For four busy days, the Sunny Day Club worked harder than they ever had before.

Jules painted signs for every room of the museum: "The Keeper's Kitchen," "The 112 Stairs," and "The Great Lamp." Priya made a schedule so every visitor would get a tour. Lena spent hours with Sam's mom at the top of the lighthouse, tightening bolts and polishing the giant lamp until it gleamed. And Rosie practiced being a tour guide, telling the story of the lighthouse to anyone who would listen, including the seagulls.

On Saturday morning, half of Gull Harbor rode boats out to the island. Mr. Baptiste ferried people back and forth on the Sea Biscuit, wearing his best captain's hat.

At eleven o'clock, a car pulled up at the harbor. Sam's mom helped an old man step out. He had a white mustache, a cane, and the same big grin as Sam.

Nana June walked slowly down the dock. Walt walked slowly up it. When they met in the middle, neither of them said anything at first. Then Walt held out his hand, and in it was a tiny brass compass, exactly like the one in June's wooden box.

"You still have yours?" June whispered.

"Every day for sixty years," said Walt.

Everyone on the dock cheered.

That night, after the visitors had gone home, Sam's mom flipped a big switch at the top of the lighthouse. With a deep hum, the great lamp turned on for the first time in thirty years. A beam of golden light swept across the dark water, around and around, as if the lighthouse were waking up and stretching.

The Sunny Day Club stood on the rocks with Sam, Walt, and Nana June, watching it shine.

"Do you know what the best part of this mystery was?" Rosie said.

"The cinnamon rolls," said Jules.

Everyone laughed. "No," said Rosie. "The best part was that the answer wasn't a treasure. It was a friendship."

Priya opened the notebook one last time that summer and wrote: "Case closed. Two old friends found. One lighthouse shining again."`,
    qs: [
      ['What was Lena\'s job before the museum opened?', ['Fixing and polishing the giant lamp', 'Painting signs', 'Making a schedule', 'Giving tours'], 0],
      ['What did Walt bring to show June?', ['A tiny brass compass', 'A letter', 'A flashlight', 'A photograph'], 0],
      ['What does it mean that Walt kept the compass "every day for sixty years"?', ['He never forgot his friend June', 'He needed it to find his way', 'He collects compasses', 'He found it yesterday'], 0],
      ['What happened when the lamp turned on?', ['A golden beam swept across the water', 'It broke', 'It turned blue', 'Nothing happened'], 0],
      ['According to Rosie, what was the best part of the mystery?', ['Finding a friendship, not a treasure', 'The cinnamon rolls', 'The boat ride', 'Winning a prize'], 0]
    ] }
];


/* ===================== NEW: The Moonstone Mystery (Gia · Skyfire Academy mystery) =====================
   A chapter-book mystery. Questions train critical reading: clues vs. red herrings, evidence,
   predictions, main idea and the author's choices. `deep: true` keeps these authored questions first. */
const MOONSTONE_BOOK = [
  { title: 'The Empty Tower', emoji: '🌙', series: 'quest', deep: true,
    text: `Every night, the Star Tower at Skyfire Academy glowed silver. At the very top sat seven moonstones on a stone shelf. They soaked up moonlight and kept the dragon nests warm all winter.

One morning, Master Oona called the students into the hall. Her face was serious. "Three moonstones are missing," she said. "Without them, the baby dragons in the nests will get cold."

Everyone gasped. Mira glanced at her water dragon, Ripple. Ripple loved shiny things, and everybody knew it. Ripple sank low in the pond and blew a nervous bubble.

Tobin crossed his arms. "I saw someone near the tower last night," he whispered to Wren. "But it was too dark to see who."

Wren looked at Pebble, her small gray earth dragon. Pebble could feel stones the way other dragons could smell smoke. "Can you sense the moonstones?" Wren asked in her mind.

Pebble closed his eyes. "They are not far," he answered. "And they are humming. Something is keeping them warm."

Wren frowned. Moonstones only hummed when they were together. So whoever took them had not scattered them. They were all in one place.

"Then this is a mystery," Wren said out loud. "And we are going to solve it."`,
    qs: [
      ['What is the main problem in this chapter?', ['Three moonstones are missing and the baby dragons could get cold', 'Ripple will not come out of the pond', 'Tobin lost his way in the dark', 'Master Oona is moving away'], 0],
      ['Why does everyone look at Ripple?', ['Ripple loves shiny things, so she seems like a suspect', 'Ripple was seen in the tower', 'Ripple told them she took the stones', 'Ripple was crying'], 0],
      ['What clue tells Wren the stones are all in one place?', ['They are humming, and moonstones only hum when together', 'Tobin saw them in a bag', 'There is silver dust on the stairs', 'Master Oona found one stone'], 0],
      ['Why do you think the author tells us Ripple "blew a nervous bubble"?', ['To make us wonder if Ripple is guilty', 'To show that Ripple is hungry', 'To explain how dragons breathe underwater', 'To prove that Ripple took the stones'], 0],
      ['What do you predict Wren will do next?', ['Use Pebble\'s stone sense to search for the moonstones', 'Go home to the farm', 'Ask Ripple to leave the academy', 'Give up and go to sleep'], 0]
    ] },
  { title: 'Silver Dust', emoji: '✨', series: 'quest', deep: true,
    text: `After lessons, Wren, Tobin, and Mira climbed the two hundred steps of the Star Tower. Blaze, Ripple, and Pebble flew beside the windows.

At the top, the stone shelf looked sad and empty in three places. Wren knelt down. On the floor was a thin line of silver dust. It sparkled like crushed stars.

"Moonstone dust," said Mira. "It rubs off when the stones are moved."

The line of dust did not go to the stairs. It went to the window and stopped.

"The thief did not walk down," said Tobin slowly. "The thief went out the window."

"So the thief can fly," said Wren.

Mira bit her lip. "Ripple can fly a little," she said quietly. "But Ripple was in the pond all night. I know, because she splashed me awake at sunrise."

Tobin looked closer at the window ledge. Pressed into the soft moss were tiny footprints. Each one had three thin toes, pointing forward.

"Those are not Ripple's," said Wren. "Water dragons have webbed feet with four toes."

Pebble sniffed the ledge. "There is something else," he said in Wren's mind. "Feathers. Very small ones. And they smell like pine trees."

Wren wrote everything down in her notebook: silver dust, the window, three-toed tracks, pine-smelling feathers.

"A clue is like a puzzle piece," Master Oona always said. "One piece is a guess. Many pieces make a picture."`,
    qs: [
      ['Which clue shows that the thief left through the window?', ['The silver dust stopped at the window', 'The door was locked', 'Tobin heard flapping', 'A moonstone was on the stairs'], 0],
      ['Which piece of evidence helps prove Ripple is NOT the thief?', ['The tracks have three thin toes, but Ripple has four webbed toes', 'Ripple says she is sorry', 'Ripple is too big for the tower', 'Ripple does not like moonstones'], 0],
      ['What can we infer about the thief from the feathers and tracks?', ['It is a small creature with feathers that can fly', 'It is a big fire dragon', 'It is one of the students', 'It is Master Oona'], 0],
      ['What does Master Oona\'s saying about puzzle pieces mean?', ['You need many clues, not just one, to be sure', 'Puzzles are better than books', 'Clues are always wrong', 'Only teachers can solve mysteries'], 0],
      ['Why did the author put Wren\'s list of clues in this chapter?', ['To help the reader remember the clues and solve the mystery too', 'To show that Wren has messy writing', 'To make the chapter longer', 'To tell us the answer right away'], 0]
    ] },
  { title: 'The New Student', emoji: '🦅', series: 'quest', deep: true,
    text: `The next day, a new student arrived at Skyfire Academy. Her name was Kestrel, and her dragon was named Dusk. Dusk was a shadow dragon, dark purple and quick as a whisper.

Kestrel did not smile much. She sat alone at lunch and fed Dusk bits of dried fish.

"Kestrel came the same week the moonstones went missing," Tobin said under his breath. "And shadow dragons are good at sneaking."

Wren wanted to agree. It would be an easy answer. But she thought about her notebook.

"Dusk is a dragon," she said. "Dragons have scales, not feathers. And Dusk's feet are as big as my hand. The tracks were tiny."

Tobin frowned. "Maybe she had help."

"Maybe," said Wren. "But we should not blame someone just because she is new and quiet. That is not a clue. That is a feeling."

That afternoon, Wren sat down next to Kestrel. "Do you want to help us solve a mystery?" she asked.

Kestrel looked surprised. Then, for the first time, she smiled. "Dusk can see in the dark," she said. "If something flies near the tower at night, Dusk will spot it."

Mira grinned. "Then tonight, we keep watch."`,
    qs: [
      ['Why does Tobin suspect Kestrel?', ['She is new and her shadow dragon is sneaky', 'She has moonstone dust on her hands', 'She told him she took the stones', 'She was seen at the window'], 0],
      ['What is the difference between a clue and a feeling, according to Wren?', ['A clue is evidence you found; a feeling is just what you think', 'A clue is always about dragons', 'A feeling is better than a clue', 'There is no difference'], 0],
      ['Which evidence shows that Dusk probably did not leave the tracks?', ['Dusk has scales and big feet, but the tracks were tiny with feathers', 'Dusk was asleep', 'Dusk cannot fly', 'Dusk is purple'], 0],
      ['What lesson does the author want readers to learn in this chapter?', ['Don\'t blame someone just because they are new or different', 'Always eat dried fish', 'Shadow dragons are dangerous', 'Never talk to new students'], 0],
      ['How does Kestrel change by the end of the chapter?', ['She goes from alone and serious to smiling and helping', 'She goes from happy to angry', 'She leaves the academy', 'She becomes the thief'], 0]
    ] },
  { title: 'Night Watch', emoji: '🔭', series: 'quest', deep: true,
    text: `That night, the friends hid behind the big water barrels at the bottom of the Star Tower. Clouds covered the moon. It was very dark.

"Why tonight?" whispered Mira.

Wren opened her notebook. "The stones went missing on Monday, Wednesday, and Friday," she said. "On each of those nights, it was cloudy."

"Why would cloudy nights matter?" asked Tobin.

"On clear nights, the tower glows bright silver," said Wren. "Maybe the thief only comes when it is dark enough to hide."

They waited a long time. Blaze's tummy rumbled. Ripple yawned a bubble. Pebble rested his head on Wren's knee.

Then Dusk lifted her head. Her eyes glowed like two small lamps. "Something is flying," Kestrel whispered.

A small shape fluttered up to the tower window. It was not a dragon. It was smaller than a cat, with green-brown feathers and a long curly tail. It slipped inside.

A moment later, it flew out again. In its tiny claws was a glowing moonstone.

"After it!" said Tobin.

"No," said Wren, holding his sleeve. "If we chase it, it will drop the stone and it might break. Let's follow it quietly and see where it goes."

Pebble's stone sense hummed in Wren's mind. "I can feel the moonstone," he said. "I can follow it, even in the dark."`,
    qs: [
      ['Why did Wren choose a cloudy night for the watch?', ['The stones only went missing on cloudy nights', 'Clouds make dragons fly faster', 'Master Oona told her to', 'She likes the rain'], 0],
      ['What pattern did Wren find in her notebook?', ['Monday, Wednesday, and Friday were all cloudy', 'The thief only came on weekends', 'Tobin was always late', 'The stones were always red'], 0],
      ['Why does Wren stop Tobin from chasing the creature?', ['The creature might drop and break the moonstone', 'Tobin is too slow', 'She wants the creature to escape', 'It is past bedtime'], 0],
      ['How is the thief different from what Tobin first guessed?', ['It is a small feathered creature, not a student or a dragon', 'It is a giant dragon', 'It is Master Oona', 'It is Ripple after all'], 0],
      ['Why does the author show Blaze\'s tummy rumbling and Ripple yawning?', ['To show that waiting took a long time and make the scene feel real', 'To show they were sick', 'To give away the answer', 'To show it was morning'], 0]
    ] },
  { title: 'The Secret in the Pines', emoji: '🌲', series: 'quest', deep: true,
    text: `The little creature flew over the wall and into the pine forest behind the academy. Pebble led the way, following the hum of the moonstone. The others tiptoed after him.

Deep in the pines, there was a soft silver glow. Wren peeked around a tree trunk.

In a hollow log sat a nest made of moss and pine needles. In the middle of the nest were three moonstones, and now a fourth. Snuggled against the warm stones were two speckled eggs.

The creature landed on the edge of the nest and cooed softly.

"It's a quillwing," whispered Kestrel. "My grandmother told me about them. They are very rare. Their eggs need warmth to hatch, or the babies won't make it."

Mira's eyes filled with tears. "So it wasn't stealing to be mean," she said. "It was keeping its babies alive."

Tobin scratched his head. "But the baby dragons at the academy need the stones too."

Everyone was quiet. It was a hard problem. Both sides needed warmth.

Wren looked at Pebble. Then she looked at Blaze, Tobin's fire dragon. An idea sparked in her mind like a match.

"What if," she said slowly, "nobody has to lose?"`,
    qs: [
      ['Why did the quillwing take the moonstones?', ['To keep its eggs warm so they could hatch', 'Because it liked shiny things', 'To sell them', 'Because Kestrel told it to'], 0],
      ['Which earlier clue makes sense now that we know about the quillwing?', ['The tiny three-toed tracks and pine-smelling feathers', 'Ripple\'s nervous bubble', 'Kestrel sitting alone', 'Blaze\'s rumbling tummy'], 0],
      ['What is the hard problem the friends face at the end of this chapter?', ['The quillwing eggs and the baby dragons both need the warm stones', 'They are lost in the forest', 'The quillwing is angry', 'The moonstones are broken'], 0],
      ['How did Mira\'s feelings about the thief change?', ['She felt sorry for it when she learned it was saving its babies', 'She got angrier', 'She was afraid of it', 'She did not care'], 0],
      ['Why do you think the author ended the chapter with Wren\'s question?', ['To make readers wonder about her plan and want to read on', 'Because the book is over', 'To show Wren is confused', 'To make the reader sleepy'], 0]
    ] },
  { title: 'Warmth for Everyone', emoji: '🔥', series: 'quest', deep: true,
    text: `Wren explained her plan. "Pebble can make ordinary stones glow when he touches them," she said. "And Blaze can heat stones with his fire. Together, they can make warm stones for the quillwing."

The next morning, Pebble found the smoothest river stones in the stream. He pressed his nose to each one until it glowed a soft gold. Then Blaze breathed a gentle, careful flame over them. The stones grew warm, but not too hot.

That evening, the friends carried the warm stones to the hollow log. Carefully, Wren swapped them for the moonstones. The quillwing watched with bright eyes. Then it fluffed its feathers and settled down on its eggs. It did not seem to mind at all.

They brought the four moonstones back to the Star Tower. Master Oona held one up to the light and smiled.

"You found the stones," she said. "But you did something better than that. You found out why they were taken. And you made sure no one was hurt."

Three weeks later, two tiny quillwings hatched in the pine forest. Kestrel and Dusk visited them every day.

Wren wrote one last line in her notebook: Every mystery has a reason. Look for the reason, not just the thief.`,
    qs: [
      ['What is the main idea of the whole book?', ['Looking for the reason behind a problem can help everyone', 'Moonstones are pretty', 'Fire dragons are the strongest', 'You should never go into the forest'], 0],
      ['How did the friends solve the problem so nobody lost?', ['They made warm glowing stones for the nest and returned the moonstones', 'They took the eggs to the academy', 'They chased the quillwing away', 'They bought new moonstones'], 0],
      ['Why does Master Oona say they did "something better" than finding the stones?', ['They figured out why the stones were taken and kept everyone safe', 'They were very fast', 'They got the stones back without help', 'They caught the thief in a cage'], 0],
      ['What does Wren\'s last notebook line mean?', ['Understanding why someone did something matters more than just blaming them', 'Always write in a notebook', 'Thieves are always mean', 'Mysteries are too hard to solve'], 0],
      ['What was the author\'s purpose in writing this book?', ['To entertain with a mystery and teach kindness and careful thinking', 'To teach how to build a tower', 'To explain how to cook with fire', 'To list facts about real birds'], 0]
    ] }
];

/* ===================== NEW: Dokemon (Miles · Biscuit & Pals track) =====================
   Original pocket-creature stories. Short sentences for a level-2 reader.
   Each set of questions includes "mostly about" (main idea) and "why did the author write it" (author's purpose). */
const DOKEMON = [
  { level: 5, title: 'Max Meets Sparko', emoji: '⚡', series: 'dokemon',
    text: `Max has a Doke-Pod. It is red and round. Max goes to the park to find a Dokemon.

He sees a bush shake. Zap! A little yellow Dokemon hops out. It has blue stripes and a tail like a bolt.

"I am Sparko!" it says. Sparko is shy. It hides behind a rock.

Max sits down. He does not run at Sparko. He holds out a snack. Sparko comes close and eats it.

"Will you be my pal?" asks Max. "Zap, zap!" says Sparko. It hops into the Doke-Pod. Now they are a team!`,
    qs: [
      ['What is this story mostly about?', ['Max makes friends with a Dokemon named Sparko', 'Max goes to school', 'Sparko eats a big cake', 'Max loses his Doke-Pod'], 0],
      ['What did Sparko do when it was shy?', ['It hid behind a rock', 'It ran home', 'It went to sleep', 'It cried'], 0],
      ['How did Max get Sparko to come close?', ['He sat down and held out a snack', 'He ran after it', 'He yelled at it', 'He threw his Doke-Pod'], 0],
      ['What does Sparko\'s tail look like?', ['A bolt', 'A leaf', 'A fish', 'A star'], 0],
      ['Why did the author write this story?', ['To show that being calm and kind helps you make friends', 'To teach how to bake bread', 'To tell facts about cars', 'To show that running fast is best'], 0]
    ] },
  { level: 5, title: 'Embit Is Cold', emoji: '🔥', series: 'dokemon',
    text: `Embit is a fire Dokemon. Embit is a red fox with a flame on its tail.

One day, it rains and rains. The rain hits Embit's tail. The flame gets small. Embit is cold. It shakes.

"Oh no!" says Max. "Embit needs to get dry!"

Max picks up Embit. He puts his coat on top of Embit. Sparko makes a warm glow with its zap.

Then the sun comes out. The flame on Embit's tail gets big and bright. Embit licks Max on the nose. "Thank you!" it yips.`,
    qs: [
      ['What is this story mostly about?', ['Max and Sparko help Embit when the rain makes it cold', 'Embit learns to swim', 'Max finds a new coat at the store', 'Sparko and Embit have a race'], 0],
      ['Why did Embit\'s flame get small?', ['The rain hit its tail', 'It was too sleepy', 'It ate too much', 'Sparko took it'], 0],
      ['How did Max help Embit?', ['He put his coat on top of it', 'He gave it ice', 'He put it in the pond', 'He sent it home'], 0],
      ['How did Embit feel at the end?', ['Warm and thankful', 'Mad', 'Still cold', 'Scared'], 0],
      ['Why did the author write this story?', ['To show that friends help each other when things go wrong', 'To teach about cooking', 'To tell how rain is made', 'To show that foxes are scary'], 0]
    ] },
  { level: 6, title: 'Splashy Finds a Home', emoji: '💧', series: 'dokemon',
    text: `Splashy is a water Dokemon. It is a little blue otter. Splashy lives in a pond, but the pond is getting dry. There is not much water left.

"Splashy needs a new home," says Max.

Max, Sparko, and Embit go to look. Is the mud pit good? No, it is too dirty. Is the bird bath good? No, it is too small.

Then they hear a sound. Splish, splash! It is a big, clean lake with lots of fish.

Splashy jumps in and swims in a happy circle. "This is the best home!" says Splashy. Max smiles. Now they can visit Splashy every day.`,
    qs: [
      ['What is the main idea of this story?', ['The friends help Splashy find a new home with more water', 'Splashy learns to fly', 'Max goes fishing with his dad', 'The pond gets bigger all by itself'], 0],
      ['What was the problem at the start?', ['The pond was getting dry', 'Splashy was lost', 'Max was sick', 'Embit was cold'], 0],
      ['Why was the bird bath not a good home?', ['It was too small', 'It was too dirty', 'It was too far', 'It was too cold'], 0],
      ['How did the friends find the lake?', ['They heard a splish, splash sound', 'They saw a map', 'A bird told them', 'Max read a sign'], 0],
      ['Why do you think the author had them try a few places first?', ['To show that you keep trying until you find what works', 'To make the story boring', 'To show that mud is the best', 'Because the author forgot the lake'], 0]
    ] },
  { level: 6, title: 'The Doke-Race', emoji: '🏁', series: 'dokemon',
    text: `It is race day at the Dokemon Club! Max and his pals line up. Sparko is very fast. Leafo the leaf turtle is very slow.

"Ready, set, go!" Sparko zooms off. Zap, zap, zap! Leafo walks one step at a time.

Sparko runs so fast that it runs right past the turn. It ends up in the bushes!

Leafo keeps walking. Step, step, step. Leafo does not stop. Leafo crosses the line first!

Everyone cheers. Sparko is a little sad. Then Sparko laughs. "Next time, I will watch where I am going!" Sparko gives Leafo a high five.`,
    qs: [
      ['What is this story mostly about?', ['A slow Dokemon wins a race by not giving up', 'Sparko gets a new pod', 'The friends go to sleep', 'Leafo learns to swim fast'], 0],
      ['Why did Sparko not win?', ['It ran past the turn and ended up in the bushes', 'It fell asleep', 'It was too slow', 'It did not start'], 0],
      ['How did Leafo win?', ['It kept walking and did not stop', 'It ran very fast', 'It took a shortcut', 'Sparko let it win'], 0],
      ['What did Sparko do at the end?', ['Laughed and gave Leafo a high five', 'Went home mad', 'Cried all day', 'Said it was not fair'], 0],
      ['What lesson does the author want you to learn?', ['Slow and steady can win, and be a good sport', 'Always be the fastest', 'Never race your friends', 'Turtles cannot win races'], 0]
    ] },
  { level: 7, title: 'Rumble Is Lost', emoji: '🪨', series: 'dokemon',
    text: `Rumble is a rock Dokemon. It looks like a little gray bear made of stone. One morning, Rumble is gone! Max looks all over.

"Let's be detectives," says Max. "We need clues."

Sparko finds the first clue. There are big round paw prints in the dirt. They go up the hill.

Embit finds the second clue. There are little bits of gray rock on the path. "Rumble's back is rocky," says Max. "Bits fall off when it climbs!"

They follow the prints and the rock bits to the top of the hill. There is Rumble, sitting in a sunny spot, looking at the view.

"I just wanted to see the whole town," says Rumble. Max sits down next to it. The view is beautiful. "Next time, let's come together," says Max.`,
    qs: [
      ['What is this story mostly about?', ['Max and his pals use clues to find Rumble', 'Rumble builds a house', 'Max moves to a new town', 'Embit learns to climb'], 0],
      ['Which TWO clues helped them find Rumble?', ['Paw prints and bits of gray rock', 'A note and a map', 'A song and a bell', 'A hat and a sock'], 0],
      ['Why were there bits of rock on the path?', ['Rumble\'s rocky back drops bits when it climbs', 'Someone broke a wall', 'It rained rocks', 'Sparko threw them'], 0],
      ['Why did Rumble go up the hill?', ['It wanted to see the whole town', 'It was hiding from Max', 'It was scared', 'It wanted food'], 0],
      ['Why did the author make Max a detective in this story?', ['To show how looking for clues helps you solve a problem', 'To show that detectives are scary', 'To teach how to climb a hill', 'To tell facts about real bears'], 0]
    ] },
  { level: 7, title: 'Flutterbit Can Not Sleep', emoji: '🦋', series: 'dokemon',
    text: `Flutterbit is a wind Dokemon. It is a little butterfly with rainbow wings. At night, Flutterbit can not sleep. It flaps and flaps.

"What is wrong?" asks Max.

"The moon is too bright," says Flutterbit. "And the owl is too loud. Hoo, hoo!"

Max thinks. He has an idea. He makes a little tent out of a leaf to block the moon. Splashy sings a soft, slow song to cover the hoots.

Flutterbit snuggles in the leaf tent. Its wings stop flapping. Its eyes close. Soon, Flutterbit is fast asleep.

In the morning, Flutterbit feels great. "Thank you for helping me rest," it says. "Now I have the energy to fly all day!"`,
    qs: [
      ['What is the main idea of the story?', ['The friends help Flutterbit get a good night\'s sleep', 'Flutterbit flies to the moon', 'The owl learns a new song', 'Max goes camping alone'], 0],
      ['What TWO things kept Flutterbit awake?', ['The bright moon and the loud owl', 'Rain and wind', 'A bad dream and a bug', 'Hunger and thirst'], 0],
      ['How did Max block the moonlight?', ['He made a tent out of a leaf', 'He turned off the moon', 'He used a blanket', 'He closed a door'], 0],
      ['What can you infer about why sleep matters?', ['Rest gives you energy for the next day', 'Sleep makes you hungry', 'You should never sleep', 'Sleep is only for owls'], 0],
      ['Why did the author write this story?', ['To show that friends can solve problems with good ideas', 'To scare kids about owls', 'To teach how to fly', 'To tell facts about the moon'], 0]
    ] },
  { level: 8, title: 'The Dokemon Club Show', emoji: '🎪', series: 'dokemon',
    text: `The Dokemon Club is putting on a show for the whole town. Each Dokemon will do a trick.

Sparko makes the stage lights twinkle. Embit makes a ring of warm, safe flames. Splashy makes a fountain that sprays in the shape of a heart. Rumble lifts a big rock over its head.

But Leafo is worried. "I can't do any tricks," it says. "I am just slow."

Max thinks for a moment. "You are slow, but you are also very patient," he says. "And you can grow plants."

On the night of the show, Leafo goes last. It plants one tiny seed. Everyone waits. Leafo waits too, calm and still. Then the seed sprouts. It grows into a tall sunflower, right in front of everyone!

The town cheers the loudest of the whole night. Leafo grins. "My slow trick was the best one of all."`,
    qs: [
      ['What is this story mostly about?', ['Leafo learns that its own special skill is worth sharing', 'Sparko fixes the stage lights', 'The town builds a new school', 'Rumble lifts the heaviest rock'], 0],
      ['Why was Leafo worried at first?', ['It thought it could not do any tricks', 'It was sick', 'It lost its seed', 'It was scared of the town'], 0],
      ['What did Max help Leafo notice?', ['That it was patient and could grow plants', 'That it was the fastest', 'That it could fly', 'That it should skip the show'], 0],
      ['Why did the town cheer the loudest for Leafo?', ['Its patient trick grew a sunflower right in front of them', 'It was the funniest', 'It made the most noise', 'It went first'], 0],
      ['What message does the author want readers to remember?', ['Everyone has something special they can do', 'Fast tricks are always best', 'Only big Dokemon can be in shows', 'Plants grow in one second'], 0]
    ] },
  { level: 8, title: 'The Big Storm Rescue', emoji: '⛈️', series: 'dokemon',
    text: `A big storm blows into town. The wind is strong. The rain is cold. A little kitten is stuck on top of a shed, and the water below is rising.

"We have to help!" says Max. "But we must be careful. We need a plan."

Max thinks about what each pal can do. Rumble builds a stone step so Max can climb up safely. Sparko makes a bright light so everyone can see in the dark. Flutterbit flaps its wings to push the rain away from the kitten. Splashy swims below, just in case anyone slips.

Max climbs the stone step. He holds out his arms. The kitten jumps right into them!

Everyone gets home safe and dry. The kitten's family says thank you again and again. Max hugs his pals. "We did it together," he says. "Nobody could have done it alone."`,
    qs: [
      ['What is the main idea of this story?', ['The team works together to save a kitten in a storm', 'Max plays in the rain', 'Splashy learns to swim', 'The shed falls down'], 0],
      ['Why did Max say "we need a plan"?', ['The storm was dangerous, so they had to be careful', 'He wanted to go home', 'He was bored', 'The kitten told him to'], 0],
      ['What did Sparko do to help?', ['Made a bright light so everyone could see', 'Built a stone step', 'Pushed the rain away', 'Swam below'], 0],
      ['Why was Splashy swimming below?', ['In case anyone slipped into the water', 'To catch fish', 'To take a bath', 'To race'], 0],
      ['What does Max mean by "nobody could have done it alone"?', ['Each pal\'s special skill was needed to make the rescue work', 'Max was scared to be alone', 'The kitten was too heavy', 'Nobody wanted to help'], 0]
    ] }
];
// Put Dokemon stories at the front of Miles's levels so they come up next
DOKEMON.forEach(st => { const L = SON_TRACK.levels.find(l => l.n === st.level); if (L && L.stories) L.stories.unshift(st); });

/* ============================================================
   MILES — levels 9–12: "Max & the Doke Detectives" chapter mysteries (original).
   Built to match early chapter-book mysteries (Guided Reading ~J → M):
   longer stories, more characters, clues spread across pages, and
   questions about evidence, inference, main idea and word meaning.
   Cast: Max (trainer, keeps a Clue Notebook), his friend Nora, and the
   Dokemon Sparko (electric), Embit (fire), Splashy (water), Leafo (grass),
   Rumble (rock) and Flutterbit (flying).
   ============================================================ */
SON_TRACK.series.dokecase = { name: 'Doke Detectives', emoji: '🕵️' };
SON_TRACK.levels.push(
{ n: 9, title: 'Case Cracker', kind: 'story', stories: [
{ level: 9, title: 'The Missing Doke-Pod', emoji: '📟', series: 'dokecase', text: `Max had a Doke-Pod. It was small and round and silver, and it could tell him the name of every Dokemon in the world. Max kept it in his front pocket every single day.

On Monday morning, the Doke-Pod was gone.

"It was here last night," Max said. He checked his pocket again. He looked under his bed and behind the couch. Sparko zipped around the room, sparks popping from his tail.

"Let's be detectives," said Max. He opened his Clue Notebook. "First, where did I go yesterday?"

Max wrote a list. He went to the park. He went to Nora's house. He ate dinner. He took a bath.

"Clue number one," Max said. "When I took my bath, I put my clothes in the laundry basket."

Max ran to the laundry room. The basket was empty! The washing machine was humming.

"Oh no," said Max. "Mom is washing my pants!"

Splashy hopped onto the machine and pressed her face to the round window. Round and round went the clothes. Then something silver flashed.

Mom stopped the machine just in time. Max reached in and pulled out his Doke-Pod. It was wet and covered in bubbles.

"Is it broken?" Max whispered.

Sparko touched it with the very tip of his tail. Bzzt! The little screen lit up. "Hello, Max!" said the Doke-Pod.

Max wrote one more line in his Clue Notebook: Always check your pockets. Case closed.`,
  qs: [
    ['What was Max looking for?', ['His Doke-Pod', 'His Clue Notebook', 'His shoes', 'Sparko'], 0],
    ['Why did Max make a list of where he went?', ['To figure out where he might have lost it', 'To plan a party', 'To practice spelling', 'Because Mom asked him to'], 0],
    ['Which clue helped Max solve the case?', ['He put his clothes in the laundry basket', 'Nora had a new toy', 'The park was muddy', 'Sparko was hungry'], 0],
    ['What does "humming" mean in this story?', ['Making a low, steady sound', 'Singing a song with words', 'Shaking very hard', 'Standing still'], 0],
    ['What lesson did Max learn?', ['Always check your pockets', 'Never take a bath', 'Washing machines are scary', 'Sparko is a bad helper'], 0]
  ] },
{ level: 9, title: 'Footprints in the Park', emoji: '👣', series: 'dokecase', text: `Nora ran up to Max at the park. "Someone dug up all of Mrs. Green's tulips!" she said. "There are holes everywhere."

Mrs. Green stood by her flower bed with her hands on her hips. Brown dirt was scattered across the sidewalk.

Max opened his Clue Notebook. "Let's look for clues," he said.

Leafo walked slowly between the holes. She sniffed each one. Then she pointed with a leaf. In the soft dirt were footprints. They were small and round, with four little toes.

"Those are not people prints," said Nora.

"And they are not Dokemon prints, either," said Max. "Rumble has big flat feet. Splashy has webbed feet. These are different."

Max wrote: Small prints. Four toes. Something that likes to dig.

Then Flutterbit flew up into an oak tree. She chirped loudly. Max and Nora looked up. On a high branch sat a squirrel with very fat cheeks.

"Clue number two," said Max. "Squirrels bury food in the ground. They dig holes to hide nuts."

"But why would a squirrel dig up tulips?" asked Nora.

Mrs. Green laughed. "Tulips grow from bulbs," she said. "Bulbs look a little bit like nuts! The squirrel must have thought my garden was a snack shop."

The kids helped Mrs. Green plant the bulbs again. Then Rumble placed a ring of smooth stones around the flower bed, and Mrs. Green covered it with a wire net.

"Now the squirrel will have to find another snack," said Max. He closed his notebook. Case closed.`,
  qs: [
    ['What problem did Mrs. Green have?', ['Someone dug up her tulips', 'Her cat was lost', 'Her tree fell down', 'Her house was painted'], 0],
    ['How did Max know the prints were not from Rumble?', ['Rumble has big flat feet', 'Rumble was asleep', 'Rumble cannot walk', 'Rumble was at home'], 0],
    ['Who helped find the squirrel?', ['Flutterbit', 'Splashy', 'Embit', 'Mrs. Green'], 0],
    ['Why did the squirrel dig up the tulips?', ['The bulbs looked like nuts', 'It wanted flowers for its nest', 'It was angry at Mrs. Green', 'It was playing a game'], 0],
    ['What is the main idea of this story?', ['Max uses clues to find out who dug up the garden', 'Nora learns to plant tulips', 'Squirrels are bad pets', 'Rumble finds pretty stones'], 0]
  ] },
{ level: 9, title: 'Who Took the Blue Ribbon?', emoji: '🎀', series: 'dokecase', text: `It was the day of the Town Pet Show. Max brushed Sparko's fur until it was fluffy. Nora painted Embit's claws bright orange.

The judge was Mr. Pike. He held up a shiny blue ribbon. "This goes to the best pet in town!" he said. He set the ribbon on a table next to a plate of cookies.

Then the wind blew. The tent flapped. When everyone looked back, the blue ribbon was gone!

"Who took it?" cried Mr. Pike.

Max opened his Clue Notebook. "Let's think," he said. "The ribbon was next to the cookies. Look! Some cookies are gone too."

Nora pointed at the grass. There were crumbs. The crumbs made a line, like a little path.

The friends followed the crumbs past the dog cages and past the fish tanks. The path ended at a big blue bush.

"Blue ribbon, blue bush," said Nora. "That is tricky. You could hide something blue in there and nobody would see it."

Embit made a tiny, gentle flame so they could see into the shadows. Inside the bush was a goat. It was chewing a cookie, and the blue ribbon was hanging from its mouth.

"Billy the goat!" laughed Mr. Pike. "He got out of his pen again. Goats will eat almost anything."

Max pulled the ribbon away very gently. It was a little wet and a little bent, but it was still blue.

At the end of the show, Mr. Pike gave out the prize. And the winner was... Billy the goat, for the funniest pet in town!`,
  qs: [
    ['Where was the ribbon before it went missing?', ['On a table next to cookies', 'In Max\'s pocket', 'On Sparko\'s neck', 'In a fish tank'], 0],
    ['What clue did Nora find in the grass?', ['A line of cookie crumbs', 'Goat hair', 'A blue feather', 'Muddy boots'], 0],
    ['Why was the blue bush a good hiding place?', ['Something blue would be hard to see in it', 'It was very tall', 'It had flowers', 'It was next to the fish'], 0],
    ['Why did the goat take the ribbon?', ['Goats will eat almost anything', 'It wanted to win', 'It was cold', 'Max gave it to him'], 0],
    ['How do you think the story ending made people feel?', ['Happy and surprised', 'Angry', 'Scared', 'Bored'], 0]
  ] },
{ level: 9, title: 'The Squeaky Door', emoji: '🚪', series: 'dokecase', text: `Every night at the same time, something went SQUEAK in Max's house. It was a long, slow sound, like a door opening very carefully.

"It's a ghost," whispered Nora when she slept over.

"Detectives don't believe in ghosts," said Max. But he pulled his blanket up a little higher anyway.

The next day, Max made a plan. He wrote in his Clue Notebook: What squeaks? When does it squeak? Who is awake?

That night, Max set three traps. They were not mean traps. They were clue traps. He put flour on the kitchen floor. He tied a tiny bell to the pantry door. And he asked Sparko to stay awake and watch.

At nine o'clock, SQUEAK! Then ding-ding went the little bell!

Max and Nora tiptoed into the kitchen. Sparko's tail glowed like a flashlight. The pantry door was open a crack. On the floor were small white footprints in the flour. They led straight into the pantry.

Max opened the door slowly. There sat Rumble, holding a bag of crackers with both hands. Crumbs covered his rocky face.

"Rumble!" said Max. "You're the ghost?"

Rumble looked down at his feet. He was a growing Dokemon, and growing Dokemon get very hungry at night.

Max laughed. "You could just ask for a snack," he said. Then Dad oiled the pantry door so it would stop squeaking.

The next night, Max left a small plate of crackers on the counter with a note: For Rumble. No ghosts allowed. Case closed.`,
  qs: [
    ['What sound did Max hear every night?', ['A squeak', 'A bark', 'A crash', 'A song'], 0],
    ['Why did Max put flour on the kitchen floor?', ['To see footprints of whoever walked there', 'To bake bread', 'To clean the floor', 'To make it slippery'], 0],
    ['What did the little bell tell Max?', ['The pantry door had opened', 'It was time for school', 'Nora was awake', 'Dinner was ready'], 0],
    ['Why was Rumble in the pantry?', ['He was hungry at night', 'He was hiding from Nora', 'He was looking for Max', 'He was scared of the dark'], 0],
    ['What does "tiptoed" mean?', ['Walked quietly on the front of your feet', 'Ran very fast', 'Jumped up and down', 'Crawled on your knees'], 0]
  ] },
{ level: 9, title: 'The Lunchbox Switch', emoji: '🍱', series: 'dokecase', text: `At school, Max opened his lunchbox. He expected a turkey sandwich and an apple. Instead, he found a pickle, a boiled egg, and a cupcake with green frosting.

"This is not my lunch," said Max.

Across the table, a boy named Theo was staring into his own lunchbox. "This isn't mine either," Theo said. "I have a turkey sandwich and an apple!"

Max looked at the two lunchboxes. They were both red. They both had a white star on the lid. They looked exactly the same.

"Clue number one," Max said. "Our lunchboxes match. Somebody mixed them up."

"But who?" asked Theo.

Max thought about the morning. All the kids put their lunchboxes on the long shelf by the door. Then Ms. Bell asked two helpers to carry them to the lunchroom.

"Who were the helpers today?" Max asked.

"You and me," said Theo slowly.

Max laughed. "Then the detective solved a mystery about himself!"

They traded lunchboxes. Max got his sandwich back, and Theo got his pickle and his cupcake.

"How can we stop this from happening again?" asked Theo.

Max opened his Clue Notebook and drew a picture. "We need a way to tell them apart," he said.

The next day, Max's lunchbox had a lightning sticker, for Sparko. Theo's lunchbox had a frog sticker, because Theo loved frogs.

"Good detectives don't just solve problems," Max said. "They stop problems from happening again."`,
  qs: [
    ['What was wrong with Max\'s lunch?', ['It was Theo\'s lunch, not his', 'It was empty', 'It was all cupcakes', 'It fell on the floor'], 0],
    ['Why were the lunchboxes easy to mix up?', ['They looked exactly the same', 'They had no lids', 'They were in different rooms', 'Theo hid them'], 0],
    ['Who mixed up the lunchboxes?', ['Max and Theo, the helpers', 'Ms. Bell', 'Sparko', 'A goat'], 0],
    ['How did they stop it from happening again?', ['They put different stickers on the lunchboxes', 'They stopped bringing lunch', 'They used paper bags', 'They ate together'], 0],
    ['What does Max mean by "good detectives stop problems from happening again"?', ['Finding a way so the problem does not come back', 'Detectives never have problems', 'Detectives should eat lunch', 'Only grown-ups solve problems'], 0]
  ] }
] },
{ n: 10, title: 'Clue Hunter', kind: 'story', stories: [
{ level: 10, title: 'The Aquarium Mystery', emoji: '🐠', series: 'dokecase', text: `Max's class took a field trip to the city aquarium. The biggest tank was as tall as a house. Sharks glided by, and silver fish swirled together like a shining cloud.

In a smaller tank, a sign said: Meet Goldie, Our Rare Golden Puffer Fish! But the tank looked empty. There were rocks, a little treasure chest, and green plants waving in the water. There was no Goldie.

A worker named Ms. Reyes rushed over. Her face was worried. "Goldie was here this morning," she said. "Now she's gone. Did somebody take her?"

Max pulled out his Clue Notebook. "Can we help look?" he asked.

First, Max checked the lid on top of the tank. It was locked tight. "Clue one," he wrote. "Nobody opened the tank from the top."

Next, Splashy pressed her face against the glass. Water Dokemon can see well underwater. She pointed her flipper at the little treasure chest. Its lid was open just a crack.

"Clue two," said Max. "Puffer fish get scared easily. When they're scared, they puff up big and round. Then they look for a safe place to hide."

"But what scared her?" asked Nora.

Max looked around. A boy from another class was tapping on the glass. Tap, tap, tap. Each tap made the water shiver.

"Clue three," Max said quietly. "Loud tapping can scare fish."

Ms. Reyes asked everyone to stop tapping. The room grew quiet. They waited. One minute. Two minutes. Then the lid of the treasure chest slowly lifted, and a little golden face peeked out.

"Goldie!" everyone whispered.

Ms. Reyes smiled. "Nobody stole her. She was hiding because she was frightened." She made a new sign for the tank: Please Don't Tap the Glass. Goldie Is Shy.`,
  qs: [
    ['Why did Ms. Reyes think someone took Goldie?', ['The tank looked empty', 'The lid was broken', 'She saw a thief', 'Goldie was in another tank'], 0],
    ['What did the locked lid tell Max?', ['Nobody opened the tank from the top', 'Goldie was a fast swimmer', 'The tank was clean', 'Ms. Reyes lost the key'], 0],
    ['What did Splashy notice?', ['The treasure chest lid was open a crack', 'A hole in the glass', 'A net on the floor', 'Food in the water'], 0],
    ['What scared Goldie?', ['Someone tapping on the glass', 'A shark', 'Splashy', 'The lights'], 0],
    ['What does "frightened" mean?', ['Scared', 'Hungry', 'Sleepy', 'Excited'], 0]
  ] },
{ level: 10, title: 'The Vanishing Snowman', emoji: '⛄', series: 'dokecase', text: `On Saturday, Max and Nora built the biggest snowman on their street. It had a carrot nose, a red scarf, two black buttons, and a tall stick hat. They named him Mr. Frost.

On Sunday morning, Mr. Frost was gone. Only the carrot, the scarf, the buttons, and the stick hat lay in the yard, sitting in a puddle.

"Somebody stole Mr. Frost!" cried Nora.

Max kneeled by the puddle and opened his Clue Notebook. "Wait," he said. "A thief would take the whole snowman. But all the parts are still here. Only the snow is missing."

Nora frowned. "Who steals only snow?"

Max looked around the yard. The rest of the snow on the grass was still white and deep. Only the spot where Mr. Frost had stood was wet. Then he noticed something else. There was a black mark on the snow next to the puddle, like something had been burned.

"Clue two," Max wrote. "A scorch mark."

Just then, Embit came waddling out of the garage. He was yawning, and little puffs of smoke drifted from his nose.

"Embit," Max said slowly, "where did you sleep last night?"

Embit pointed with his tail. Right next to where Mr. Frost had stood was a pile of blankets. Embit had been cold, so he snuggled up to the biggest, roundest thing in the yard. All night long, his warm fire body had been melting Mr. Frost, one drip at a time.

Nora laughed so hard she sat down in the snow. "The snowman thief was a sleepy fire Dokemon!"

That afternoon, they built a brand-new snowman far away from the garage. Then Max made Embit a cozy bed by the fireplace, where melting things would not be a problem.`,
  qs: [
    ['What was left in the yard where Mr. Frost had been?', ['The carrot, scarf, buttons and hat in a puddle', 'Nothing at all', 'A new snowman', 'A sled'], 0],
    ['Why did Max think a thief did NOT take Mr. Frost?', ['A thief would take the whole snowman, but the parts were still there', 'The gate was locked', 'There were no footprints', 'Nora was watching'], 0],
    ['What did the scorch mark tell Max?', ['Something hot had been there', 'Someone painted the snow', 'A car drove by', 'It rained'], 0],
    ['What really happened to Mr. Frost?', ['Embit melted him while sleeping next to him', 'Nora knocked him over', 'The wind blew him away', 'A neighbor took him'], 0],
    ['What is the main idea of this story?', ['Max uses clues to learn the snowman melted, not that it was stolen', 'Building snowmen is hard', 'Embit hates snow', 'Nora is afraid of winter'], 0]
  ] },
{ level: 10, title: 'Midnight Music', emoji: '🎵', series: 'dokecase', text: `Mrs. Lopez lived next door to Max. One morning she knocked on his door, looking very tired.

"Max," she said, "every night at midnight, I hear music in my house. Plink, plink, plink, like someone playing my piano. But when I turn on the lights, nobody is there!"

Max grabbed his Clue Notebook. "We'll find out who your midnight musician is," he promised.

Max and Nora went to Mrs. Lopez's house and looked at the piano. It was old and shiny and stood next to a big window. Max pressed one key. Plink. He pressed another. Plonk.

"Clue one," Max said. "The piano works. Somebody, or something, is pressing the keys."

Nora looked closely at the keys. "Max! Look at this." On the white keys were tiny dusty marks. Each mark was shaped like a little star.

"Those are not fingerprints," said Max. "They're too small. They look more like tiny feet."

Max looked up at the window. It was open just a little, to let in the cool night air. Outside, a tall tree stretched its branches right up to the glass.

"Clue two," Max wrote. "The window is open, and a tree is close by. Something could climb in."

That night, Max, Nora and Flutterbit hid behind the couch. The clock struck twelve. A small shadow slipped through the window and hopped onto the piano. Plink! Plonk! Plink!

Max switched on his flashlight. Sitting on the keys was a raccoon with a stripy tail. It was chasing a moth that kept landing on the piano. Every time the raccoon jumped, its little star-shaped paws played a note.

"The midnight musician!" laughed Mrs. Lopez.

Flutterbit gently chased the moth out the window, and the raccoon followed it into the tree. Then Mrs. Lopez closed her window, and that night she finally slept.`,
  qs: [
    ['What was Mrs. Lopez\'s problem?', ['She heard piano music at midnight', 'Her piano was broken', 'She lost her cat', 'Her tree fell over'], 0],
    ['What did the star-shaped marks on the keys show?', ['Tiny feet had walked on the piano', 'Someone spilled paint', 'The piano was new', 'Max was there before'], 0],
    ['Why was the open window an important clue?', ['Something could climb in from the tree', 'It let in sunlight', 'It was broken', 'It was painted blue'], 0],
    ['Why did the raccoon jump on the piano?', ['It was chasing a moth', 'It wanted to play music', 'It was looking for food', 'It was scared of Max'], 0],
    ['How did the story end for Mrs. Lopez?', ['She closed the window and finally slept', 'She sold her piano', 'She kept the raccoon as a pet', 'She moved away'], 0]
  ] },
{ level: 10, title: 'The Lost Library Book', emoji: '📕', series: 'dokecase', text: `Max loved the library. His favorite book was called Dokemon of the Deep Sea. It had pictures of glowing jellyfish Dokemon and giant whale Dokemon that sang.

But when Max went to check it out on Tuesday, the librarian, Mr. Chen, shook his head. "I'm sorry, Max. That book has been missing for a whole week. Nobody checked it out. It just disappeared."

Max opened his Clue Notebook. "Can I look for it?" he asked.

"Please do," said Mr. Chen.

Max started with the empty space on the shelf. "Clue one," he wrote. "The book is big and blue. It would be hard to hide in a pocket."

Next, he asked Mr. Chen, "Who comes to the library every day?"

Mr. Chen thought. "Story time kids come on Mondays. Older kids come after school. And Mrs. Webb comes every morning to read the newspaper."

Max checked the story time corner. There were pillows, puppets, and a big basket of picture books. No blue book.

Then Leafo tugged on Max's sleeve. She pointed to the window by the reading tables. A row of plants sat in pots along the windowsill. One of the pots was sitting on something flat and blue.

Max lifted the pot. Underneath was Dokemon of the Deep Sea! There was a round wet ring on the cover.

"Clue two," Max said. "Someone used the book to hold up a plant pot."

Mr. Chen laughed and slapped his forehead. "That was me! Last week the pot was wobbly, so I grabbed the nearest book to make it flat. Then I forgot all about it!"

Mr. Chen dried the book carefully and checked it out to Max first. And Leafo, who knew all about plants, helped him find a proper little plate for the wobbly pot.`,
  qs: [
    ['What book was Max looking for?', ['Dokemon of the Deep Sea', 'The Clue Notebook', 'A cookbook', 'A book about trains'], 0],
    ['Why did Max ask who comes to the library every day?', ['To think about who might have moved the book', 'To make new friends', 'To plan story time', 'To read the newspaper'], 0],
    ['Where was the book found?', ['Under a plant pot by the window', 'In the story time basket', 'In Mrs. Webb\'s bag', 'On the top shelf'], 0],
    ['What did the wet ring on the cover show?', ['A pot had been sitting on the book', 'Someone spilled juice', 'It rained inside', 'The book was new'], 0],
    ['Why is it funny that Mr. Chen took the book?', ['He was the librarian who was worried it was missing', 'He hates books', 'He lives in the library', 'He is a Dokemon'], 0]
  ] },
{ level: 10, title: 'The Birthday Cake Mystery', emoji: '🎂', series: 'dokecase', text: `It was Nora's birthday party. In the middle of the table sat a beautiful cake with pink frosting and seven candles. Nora's dad said, "Nobody touch the cake until we sing!"

Everyone went outside to play tag. When they came back in, someone had taken a big bite out of the cake! There was a deep scoop in the frosting, right next to the candles.

"Who did this?" Nora cried.

Max opened his Clue Notebook. "Let's look at the evidence," he said. "Evidence means the clues that prove what happened."

Max looked closely at the cake. The bite was not shaped like teeth. It was a smooth, round scoop, like someone used a spoon. "Clue one," he wrote. "A spoon was used."

He checked the kitchen. In the sink was one small spoon with pink frosting on it. "Clue two," he wrote. "The spoon is little, like a kid spoon."

Then Max looked at the floor. There was a trail of pink frosting dots. They led out of the kitchen, down the hall, and under the door of the bathroom.

Max knocked gently. "Hello?" he said.

The door opened, and there stood Nora's little brother, Leo. He was only three. Pink frosting was smeared on his cheeks, his nose, and even his eyebrows.

"I just wanted to taste it," Leo said in a tiny voice. "Everybody was outside, and I was hungry."

Nora knelt down. She wasn't angry anymore. "Leo, you have to wait for the singing. But you can be my cake helper and blow out a candle with me."

Nora's dad smoothed the frosting with a knife, and Rumble placed a big frosting flower right on top of the scoop. When they sang, nobody could even tell. Leo blew out the candles with his sister, and he smiled the biggest frosting smile in the world.`,
  qs: [
    ['What does "evidence" mean in this story?', ['Clues that prove what happened', 'A kind of cake', 'A birthday present', 'A party game'], 0],
    ['What did the smooth, round scoop tell Max?', ['A spoon was used', 'A dog took a bite', 'The cake was old', 'The candles melted'], 0],
    ['Why was the small spoon an important clue?', ['It showed a kid probably took the bite', 'It was dirty', 'It was Nora\'s favorite', 'It was gold'], 0],
    ['How did Max find Leo?', ['He followed a trail of frosting dots', 'Leo called his name', 'Sparko smelled him', 'Nora told him'], 0],
    ['How did Nora feel at the end?', ['Kind and not angry anymore', 'Still very angry', 'Scared of Leo', 'Bored at her party'], 0]
  ] }
] },
{ n: 11, title: 'Mystery Master', kind: 'story', stories: [
{ level: 11, title: 'The Zoo Train Mystery', emoji: '🚂', series: 'dokecase', text: `The little zoo train carried families around the whole zoo. It went past the lions, under the bird bridge, and through a tunnel near the bears. Max and Nora rode it every summer.

But this Saturday, the train was not moving. The driver, a tall woman named Captain Rosa, was pacing back and forth.

"The train key is missing," she explained. "I keep it on a hook inside the station. This morning the hook was empty, and nobody can drive the train without it."

Max opened his Clue Notebook. "When did you see the key last?" he asked.

"Last night when I locked up," Captain Rosa said. "I hung it on the hook myself."

Max and Nora walked into the little wooden station. The hook was by an open window. Under the window was a bench, and on the bench were three things: a peanut shell, a gray feather, and a scratch in the paint.

"Clue one," Max said, writing carefully. "The key was near an open window. Anybody, or anything, could reach it."

"Clue two," said Nora. "The feather is gray. The scratch looks like it was made by a sharp claw."

Max frowned. "And the peanut shell?"

Captain Rosa looked a little embarrassed. "That's mine. I eat peanuts on my lunch break."

Max thought hard. Which animal has gray feathers, sharp claws, and likes shiny things?

Then Flutterbit chirped and flew to the top of the station roof. Max climbed onto the bench to look. Up on the roof, tucked against the chimney, was a messy nest made of sticks, string, and bits of foil. Sitting on the nest was a big gray crow.

"Crows love shiny objects," Max said. "They pick them up and carry them home."

Flutterbit fluttered up to the nest and politely chirped at the crow. The crow tilted its head, hopped aside, and there in the nest, along with a bottle cap, a button, and a spoon, was the silver train key.

Flutterbit carried it down in her beak. Captain Rosa cheered and hurried to the engine. Toot, toot! The zoo train was moving again.

"From now on," Captain Rosa said, "I will keep the key in my pocket, and I'll leave the crow a shiny bottle cap every morning so it doesn't need to borrow mine."`,
  qs: [
    ['Why couldn\'t the zoo train move?', ['The train key was missing', 'The tracks were broken', 'It ran out of gas', 'The driver was sick'], 0],
    ['Which clue was NOT about the thief?', ['The peanut shell', 'The gray feather', 'The claw scratch', 'The open window'], 0],
    ['Why did Max think about an animal that likes shiny things?', ['The key was silver and shiny', 'The crow was singing', 'Captain Rosa told him', 'The window was shiny'], 0],
    ['What does "embarrassed" mean?', ['Feeling a little silly or shy because of something you did', 'Feeling very hungry', 'Feeling brave', 'Feeling sleepy'], 0],
    ['What is the author\'s purpose in this story?', ['To entertain with a mystery that teaches how clues work together', 'To teach you how to drive a train', 'To tell you to stay away from zoos', 'To sell peanuts'], 0]
  ] },
{ level: 11, title: 'The Lighthouse Light', emoji: '🗼', series: 'dokecase', text: `On the rocky hill above the beach stood an old white lighthouse. Nobody had lived in it for fifty years. But for three nights in a row, people in town saw a light blinking at the very top.

"It's haunted," said Theo at school. "My grandpa says the old lighthouse keeper still lives up there."

Max did not believe in ghosts, but he did believe in mysteries. That afternoon, he and Nora climbed the path to the lighthouse with Sparko and Splashy.

The door was locked with a rusty chain. "Clue one," Max wrote. "Nobody has gone in through the door. The chain is too rusty to open."

They walked all the way around the bottom of the tower. On the far side, a small window near the top was broken. A little piece of glass was missing.

"Clue two," said Nora. "Something could get in through that broken window. But it would have to fly or climb very high."

Max sat on a rock and thought. "When does the light blink?" he asked.

"Only at night," said Nora. "And only when the moon is out."

Max wrote that down. Then he wrote a question: Does the light make its own glow, or is it reflecting something?

When the sun went down, they hid behind a big rock and waited. The moon rose, round and bright. Soon, at the top of the lighthouse, a light began to blink. Flash. Dark. Flash. Dark.

Sparko's ears twitched. He could feel that there was no electricity up there at all.

"No electricity," Max whispered. "So it isn't a lamp."

Max pointed his binoculars at the top window. There, perched on the railing, was a large white owl. Each time it turned its head, a shiny piece of mirror tied around an old weather vane caught the moonlight and flashed. The owl had built its nest right next to the mirror, and every time it moved, the vane spun and sparkled.

"The ghost," said Nora, "is an owl and a mirror!"

The next day, Max told the town council. Instead of fixing the window, they put up a sign: Home of the Lighthouse Owl. Please Do Not Disturb. And every night when the moon is full, the town looks up at the blinking light and waves.`,
  qs: [
    ['Why did people think the lighthouse was haunted?', ['A light blinked at the top at night', 'They heard singing', 'The door kept opening', 'Someone saw a ghost'], 0],
    ['What did the rusty chain tell Max?', ['Nobody had gone in through the door', 'The lighthouse was new', 'Someone had the key', 'The door was painted'], 0],
    ['Why was it important that the light only blinked when the moon was out?', ['It meant the light might be reflecting moonlight', 'Ghosts only come out then', 'The owl was asleep', 'The batteries ran out'], 0],
    ['How did Sparko help?', ['He could tell there was no electricity', 'He flew to the top', 'He broke the chain', 'He scared the owl'], 0],
    ['What can you infer about the town at the end?', ['They decided to protect the owl instead of chasing it away', 'They tore down the lighthouse', 'They were still scared', 'They never went to the beach again'], 0]
  ] },
{ level: 11, title: 'The Stolen Trophy', emoji: '🏆', series: 'dokecase', text: `The Dokemon Field Day trophy was gold and shaped like a lightning bolt. It sat in a glass case in the school hallway. On Friday morning, the case was empty.

"The trophy is gone!" said the principal, Mr. Hart. "Field Day is tomorrow. What will we give the winners?"

Max took out his Clue Notebook. "Mr. Hart, may Nora and I investigate?" he asked. Investigate means to look carefully for facts.

"Please," said Mr. Hart.

Max started with the glass case. The little door was closed, and the lock was not broken. "Clue one," Max wrote. "Whoever took the trophy opened the case with a key."

"Who has a key?" Nora asked.

"Only two people," said Mr. Hart. "Me, and our custodian, Mr. Gomez."

Mr. Gomez was mopping the gym. He was a kind man who fixed everything at school. "I didn't take it," he said. "But I did see something strange last night. The lights in the art room were on late."

The art room was at the end of the hall. On the floor near the door were tiny flecks of gold glitter. They sparkled in a line all the way to the art closet.

"Clue two," said Max. "Gold glitter, like from a gold trophy, or like from gold paint."

Max opened the art closet. Inside, on a table covered in newspaper, sat the lightning bolt trophy. But it looked different. It was shinier and brighter than before, and the names on the bottom had been painted in fresh gold letters.

Just then, the art teacher, Ms. Kim, walked in. "Oh no, you found my surprise!" she said with a laugh. "The trophy was scratched and old, so I asked Mr. Hart for the key. I stayed late to fix it up for Field Day."

Mr. Hart's face turned red. "I gave you the key a week ago, and I completely forgot," he said.

Max closed his notebook. "So the trophy wasn't stolen. It was borrowed to make it better."

At Field Day, the trophy sparkled in the sun. And when Max's team won the three-legged race, he held it up high and noticed that Ms. Kim had painted one more tiny thing on the bottom: a little magnifying glass, for the school's best detective.`,
  qs: [
    ['What does "investigate" mean?', ['To look carefully for facts', 'To run a race', 'To paint a picture', 'To lock a door'], 0],
    ['Why did Max think a key was used?', ['The lock was not broken', 'He saw someone with a key', 'The case was smashed', 'Mr. Gomez told him'], 0],
    ['Which clue led Max to the art room?', ['A line of gold glitter', 'Muddy footprints', 'A note on the door', 'The sound of music'], 0],
    ['Why did Ms. Kim take the trophy?', ['To fix it up before Field Day', 'She wanted to keep it', 'She was playing a joke', 'It was hers'], 0],
    ['What is the main idea of the story?', ['Max discovers the trophy was borrowed to be fixed, not stolen', 'Max wins Field Day', 'Mr. Gomez mops the gym', 'Art class is fun'], 0]
  ] },
{ level: 11, title: 'The Map in the Bottle', emoji: '🍾', series: 'dokecase', text: `While walking on the beach, Splashy dove into the waves and came back holding a green glass bottle. Inside was a rolled-up piece of paper.

Max pulled out the cork and unrolled the paper. It was a map! It showed the beach, the old pier, three palm trees, and a big red X.

"Treasure!" shouted Nora.

"Maybe," said Max. He opened his Clue Notebook. "Good detectives ask questions before they start digging. Who made this map? And when?"

Max looked at the paper carefully. "Clue one," he wrote. "The paper is not old and yellow. It's white and crisp. This map is new."

Nora pointed to the bottom corner. "There's writing," she said. In wobbly letters, it said: Made by C.

"Clue two," said Max. "The writer signed with only one letter, and the letters are wobbly. I think a little kid made this."

They followed the map anyway. They walked past the old pier. They found the three palm trees. Then they counted twenty steps toward the water, just like the map said, and Rumble dug where the X should be.

His rocky claws hit something hard. It was a small tin box. Inside were a seashell necklace, five shiny marbles, a drawing of a dog, and a note: If you found my treasure, you are my friend. Please come play at the blue house by the beach. Love, Clara.

Nora looked at Max. "A treasure hunt for a friend," she said softly.

They walked to the blue house and knocked. A girl about five years old opened the door. Her eyes went wide. "You found it!" she cried. "I made that map a week ago. We just moved here, and I don't know anybody."

"Now you know us," said Max with a grin.

That afternoon, Clara, Max, Nora and all the Dokemon built the biggest sandcastle on the beach. And before the sun went down, Clara made a brand-new map, this time with a red X marking her own front door.`,
  qs: [
    ['How did Max know the map was new?', ['The paper was white and crisp, not old and yellow', 'It had a date on it', 'Splashy told him', 'It smelled new'], 0],
    ['What did the wobbly letters suggest?', ['A little kid probably made the map', 'A pirate made it', 'It was written in the rain', 'Max made it'], 0],
    ['Why did Max say good detectives ask questions before digging?', ['To understand the clues before acting', 'Digging is not allowed', 'To waste time', 'Because Nora was tired'], 0],
    ['Why did Clara make the treasure map?', ['She was new in town and wanted a friend', 'She was hiding from her mom', 'She wanted to trick people', 'She found real gold'], 0],
    ['What does the ending tell you about Clara?', ['She found friends and felt welcome', 'She moved away again', 'She lost her treasure', 'She was angry'], 0]
  ] },
{ level: 11, title: 'The Fake Gold Coin', emoji: '🪙', series: 'dokecase', text: `The town museum had a special new display: the Dragon Coin, a gold coin more than three hundred years old. It had a dragon on one side and a crown on the other. People lined up all morning to see it.

Max and Nora were near the front of the line when Sparko's ears suddenly shot straight up. His tail crackled.

"What's wrong, Sparko?" Max whispered.

Sparko stared at the coin in the glass case. Max had learned to trust Sparko's feelings. Electric Dokemon can sense metal, and Sparko seemed confused.

Max looked closer. He opened his Clue Notebook and started writing.

"Clue one," Max wrote. "The coin in the poster on the wall has a dragon with its tail curled to the left. The coin in the case has a tail curled to the right."

Nora gasped. "They're different! Like a mirror picture."

"Clue two," Max wrote. "Real gold doesn't make Sparko's tail crackle like that. He reacts to iron. Maybe this coin is just painted metal."

Max found the museum director, Dr. Patel, and showed her his notebook. She looked at the poster. She looked at the coin. Her eyebrows went up.

"You may be right," she said quietly. "Someone may have switched the real coin with a fake."

"Who has been near the case today?" Max asked.

Dr. Patel checked the visitor list. Only one person had asked to look at the coin up close: a man in a brown coat who said he was a coin expert. He had left just ten minutes ago.

Flutterbit flew to the front window. A man in a brown coat was walking quickly toward the bus stop.

The museum guard hurried outside and politely asked the man to wait. When Dr. Patel came out with Max's notebook, the man looked nervous. He reached into his pocket, sighed, and handed over a small velvet bag. Inside was the real Dragon Coin, with its tail curling to the left.

Later, Dr. Patel shook Max's hand. "You noticed a tiny detail that grown-ups missed," she said.

Max smiled. "That's the secret of detective work. The biggest mysteries are often solved by the smallest clues."`,
  qs: [
    ['What made Max first think something was wrong?', ['Sparko\'s ears went up and his tail crackled', 'The glass was broken', 'An alarm rang', 'Nora saw a thief'], 0],
    ['What was different between the poster coin and the case coin?', ['The dragon\'s tail curled the other way', 'The color was blue', 'One was bigger', 'One had no crown'], 0],
    ['Why was the visitor list important?', ['It showed who had been close to the coin', 'It listed the museum rules', 'It had a map', 'It showed the ticket price'], 0],
    ['What can you infer about the man in the brown coat?', ['He switched the real coin with a fake one', 'He was a museum guard', 'He was Max\'s uncle', 'He lost his bus ticket'], 0],
    ['What does Max mean by "the biggest mysteries are often solved by the smallest clues"?', ['Paying attention to tiny details can solve big problems', 'Only small mysteries matter', 'Clues are always small', 'Big people solve mysteries'], 0]
  ] }
] },
{ n: 12, title: 'Legendary Detective', kind: 'story', stories: [
{ level: 12, title: 'Night at the Museum', emoji: '🦕', series: 'dokecase', text: `Max's class got to do something amazing: a sleepover at the natural history museum. They unrolled their sleeping bags right under a giant dinosaur skeleton. Its long neck stretched toward the ceiling, and its tail curled around the room like a sleeping dragon.

After lights out, Max heard a soft clicking sound. Click. Click. Click. It echoed through the dark hall.

In the morning, a museum worker named Mr. Ford came running. "One of the dinosaur's toe bones is missing!" he said. "It's a small bone, but it's very important. Without it, we can't open the dinosaur room to visitors."

Max sat up in his sleeping bag and reached for his Clue Notebook. "Mr. Ford, can we help?"

Mr. Ford looked at all the sleepy kids and sighed. "Detectives in pajamas," he said. "Why not?"

Max began by drawing the skeleton in his notebook. The missing bone came from the back left foot, which was only a few feet off the ground. "Clue one," he wrote. "A kid could reach that foot without climbing."

Nora found the second clue. "Look," she said, pointing at the floor. "Under the foot there's a little pile of sand."

Max scooped some up. It was not normal sand. It was soft and white, like the sand in the museum's dig pit, where kids could brush away sand to find fake fossils.

"Clue two," Max wrote. "The sand came from the dig pit, so whoever took the bone was probably in the dig pit too."

Then Max remembered the clicking sound. "Clue three," he said. "Clicking in the night. Like something tapping on the hard floor."

The class walked to the dig pit. In the sand were dozens of small footprints. Most were kid shoes, from yesterday's activities. But some prints were different: tiny, with three long toes and a little point at the end.

Max knelt and studied them. "Those aren't shoes," he said. "Those are claws, and I know whose they are."

He turned around. Behind him stood Embit, looking guilty. Embit had been fascinated by the dinosaur all evening. He loved dinosaurs because they looked like giant fire Dokemon.

"Embit," Max said gently, "did you take the dinosaur's toe?"

Embit's tail drooped. He waddled to the corner of the dig pit, dug with his claws, click, click, click, and pulled out the toe bone. He had buried it, the way he'd seen the fossil hunters do in a video, because he wanted to discover a dinosaur bone of his own.

Mr. Ford carefully put the bone back on the skeleton. Then he did something surprising. He gave Embit a real fossil, a tiny shell that was millions of years old.

"Every scientist starts by being curious," Mr. Ford said. "Just remember: in a museum, we look with our eyes, not our claws."

Max wrote the last line in his notebook: Curiosity is good. Asking first is better. Case closed.`,
  qs: [
    ['Why couldn\'t the museum open the dinosaur room?', ['A toe bone from the skeleton was missing', 'The dinosaur fell over', 'The lights were broken', 'The kids were still sleeping'], 0],
    ['Why was the white sand an important clue?', ['It came from the dig pit, so the thief had been there', 'It was from the beach', 'It was very pretty', 'It showed it had rained'], 0],
    ['What made the clicking sound in the night?', ['Embit\'s claws on the hard floor', 'The dinosaur moving', 'A clock', 'Mr. Ford\'s shoes'], 0],
    ['Why did Embit take the bone?', ['He wanted to discover a dinosaur bone of his own', 'He was hungry', 'He wanted to break it', 'Max asked him to'], 0],
    ['What does "fascinated" mean?', ['Very interested', 'Very tired', 'Very angry', 'Very cold'], 0]
  ] },
{ level: 12, title: 'The Missing Mascot', emoji: '🦅', series: 'dokecase', text: `Max's school mascot was an eagle named Captain Swoop. Not a real eagle, but a big fuzzy costume with golden wings, a yellow beak, and huge googly eyes. Every year, a fifth grader wore Captain Swoop at the big soccer game against the school across town, the Riverside Raccoons.

Two days before the game, Captain Swoop disappeared from the gym closet.

"The Raccoons stole him!" shouted Theo. "They want us to lose!"

Soon everyone in the hallway was blaming Riverside. Some kids even wanted to make mean posters. But Max held up his Clue Notebook. "Wait," he said. "We don't have any evidence yet. Blaming someone without proof isn't fair."

Mr. Hart, the principal, nodded. "Max is right. Let's find out what really happened."

Max began at the gym closet. The door had been left unlocked, because the soccer balls were kept there and kids got them out at recess. "Clue one," he wrote. "Lots of people could have opened this closet."

On the closet floor, Nora found three golden feathers and a long piece of yellow thread. "Clue two," she said. "The feathers came off the costume. It looks like it got ripped."

Max followed a trail of golden fluff out the back door of the gym and across the playground. It ended at the school's little garden shed.

Inside the shed, on a workbench, lay Captain Swoop. One wing had a long rip down the middle. Next to the costume was a sewing kit, a spool of yellow thread, and a note in careful handwriting:

Dear Mr. Hart, I'm so sorry. I tripped while practicing my mascot dance, and the wing ripped. I was too embarrassed to tell anyone. I'm fixing it myself. I promise it will be ready. From, Ava, 5th grade.

Max and Nora looked at each other. Ava was the fifth grader chosen to be Captain Swoop this year.

"So the Raccoons didn't steal him," Nora said. "Ava was trying to fix him."

They found Ava at lunch. Her eyes filled with tears when she saw the notebook. "Are you going to tell?" she whispered.

"We think you should tell," said Max kindly. "But we can help."

That afternoon, Ava told Mr. Hart everything. He wasn't angry at all. "Accidents happen," he said. "Telling the truth takes courage."

Then everybody pitched in. Ava sewed, Nora held the wing steady, and Leafo used her vines like tiny fingers to tie off the knots. By the end of the day, Captain Swoop's wing looked as good as new.

At the game, Captain Swoop danced the best dance anyone had ever seen. And when Theo saw a Riverside Raccoon kid sitting alone in the stands, he went over and said sorry for blaming their school, then shared his popcorn.`,
  qs: [
    ['Why did Max stop the kids from blaming the Riverside Raccoons?', ['They had no evidence yet, and blaming without proof is not fair', 'He liked the Raccoons better', 'The principal told him to', 'He already knew Ava did it'], 0],
    ['Why was the unlocked closet an important clue?', ['It meant lots of people could have opened it', 'It meant nobody could get in', 'It had a hole', 'It was painted gold'], 0],
    ['What did the golden feathers and thread suggest?', ['The costume had been ripped', 'A real eagle was there', 'Someone was knitting a hat', 'The costume was new'], 0],
    ['Why did Ava hide the costume?', ['She was embarrassed that she ripped it and wanted to fix it', 'She wanted to keep it', 'She was on the Raccoons team', 'She hated soccer'], 0],
    ['Which sentence best states the theme (big lesson)?', ['Find the facts before you blame someone, and telling the truth takes courage', 'Soccer is the best sport', 'Costumes are hard to sew', 'Eagles are better than raccoons'], 0]
  ] },
{ level: 12, title: 'The Silent Bell', emoji: '🔔', series: 'dokecase', text: `In the middle of town stood a tall clock tower with a huge brass bell. Every hour, the bell rang: BONG, BONG, BONG. People set their watches by it, the bakery opened when it rang seven times, and kids knew to go home for dinner when it rang six.

One morning, the bell didn't ring at all.

The clock's hands still moved. The gears still turned. But at eight o'clock there was only silence. People were late for work. The bakery didn't open. The whole town felt confused.

The mayor, a cheerful woman named Mayor Bloom, asked Max to help. "Everyone says you're the best detective in town," she said.

Max climbed the winding stairs of the clock tower with Nora, Rumble, and Sparko. At the top, the giant bell hung from a thick wooden beam. A metal hammer was supposed to swing and strike it every hour.

"Clue one," Max wrote. "The hammer still moves. Listen." They waited until nine o'clock. Click, whirr, the hammer swung forward... and made a soft little thud instead of a bong.

Max climbed closer. The hammer wasn't hitting the bell. It was hitting something soft that was stuffed between the hammer and the bell. It was a big, round lump of twigs, moss, and string.

"Clue two," Max wrote. "A nest! Something built a nest right where the hammer hits."

"But a nest would get knocked down after one or two bongs," said Nora. "Why didn't it?"

Max looked closer. The nest was tied to the bell with dozens of strings, wound around and around very carefully. Birds can weave twigs, but they can't tie knots like that.

"Clue three," Max said slowly. "Somebody helped build this nest. Somebody with hands."

They went back down the stairs and asked around town. Max learned that the clock tower's caretaker, old Mr. Finch, had stopped climbing the stairs because his knees hurt. Someone else had been going up instead: his granddaughter, June.

They found June at the library, reading a book about birds. When Max asked about the nest, she bit her lip.

"A mother swallow was trying to build a nest by the bell," June explained. "But every hour, BONG, the noise knocked it down. She tried six times. I felt so sad for her that I tied her nest in place. I didn't think about the town needing the bell."

Max nodded. "You were trying to help the bird. That was kind. But now the whole town has a problem."

Nora had an idea. "What if there were a way to help the bird and the town?"

Together, they explained everything to Mayor Bloom. With Mr. Finch's advice, Rumble carved a cozy stone shelf on the other side of the tower, out of the hammer's path but still sheltered from the wind. June carefully moved the nest, with the mother bird watching from a nearby ledge. Within an hour, the swallow hopped onto her new shelf and settled in.

At ten o'clock, the hammer swung. BONG! BONG! BONG! The whole town cheered.

Max wrote the final line in his notebook: The best solutions help everyone. Case closed.`,
  qs: [
    ['What problem did the town have?', ['The clock tower bell stopped ringing', 'The clock\'s hands stopped moving', 'The bakery burned down', 'The mayor was missing'], 0],
    ['Why did Max decide that a person had helped build the nest?', ['The nest was tied with knots that birds cannot make', 'He saw footprints', 'June told him right away', 'The nest had a name tag'], 0],
    ['Why did June tie the nest to the bell?', ['The bell kept knocking the swallow\'s nest down', 'She wanted the bell to be quiet', 'She was playing a trick', 'Mr. Finch told her to'], 0],
    ['How was the problem finally solved?', ['The nest was moved to a stone shelf away from the hammer', 'The bell was taken down', 'The bird was sent away', 'The town bought a new clock'], 0],
    ['What does Max mean by "the best solutions help everyone"?', ['A good answer can solve problems for both the town and the bird', 'Detectives always win', 'Birds should not live in towns', 'Everyone should ring bells'], 0]
  ] },
{ level: 12, title: 'The Rainbow Paint Mystery', emoji: '🌈', series: 'dokecase', text: `The town was getting ready for the Spring Art Walk. Along Main Street, artists set up easels and tables. The biggest project was a giant mural on the side of the library, a painting of a forest full of animals that Ms. Kim, the art teacher, had been working on for weeks.

But on the morning of the Art Walk, people found something strange. Overnight, splashes of bright paint had appeared all over town. A red stripe ran across the bakery door. A blue swirl decorated the fire hydrant. Purple and green dots covered the sidewalk outside the toy store.

"Vandals!" grumbled Mr. Pike, the shopkeeper. Vandals are people who damage property on purpose. "Somebody is trying to ruin the Art Walk!"

Max wasn't so sure. He opened his Clue Notebook and walked down Main Street slowly, studying each splash.

"Clue one," he wrote. "Every splash is low to the ground. None of them are higher than my knees."

"Maybe the vandal is short," said Nora.

"Maybe," said Max. "Or maybe it isn't a person at all."

Max kept looking. At each splash, he noticed something else: little round smudges in the paint, as if something had stepped in it and walked away. The smudges were shaped like paws, four small pads and one bigger one.

"Clue two," he wrote. "Paw prints, about the size of a small dog."

Then Nora noticed something important. "Max," she said, "the paint colors are in the same order every time. Red, then orange, then yellow, then green, then blue, then purple. Like a rainbow."

Max's eyes widened. "Clue three. Where in town is there paint in rainbow order?"

They both said it at the same time: "Ms. Kim's paint table!"

At the library, Ms. Kim's paint table was a mess. Six paint trays, lined up in rainbow order, had footprints running through every single one. And underneath the table, curled up on a drop cloth and covered in every color imaginable, was a small, scruffy dog.

"That's Pickles," said Ms. Kim, hurrying over. "He's my neighbor's dog. He must have slipped out of his yard last night."

Pickles wagged his rainbow tail. It was easy to imagine what happened: he ran through the paint trays, then trotted all over town, stopping to sniff the bakery door, the fire hydrant, and the toy store, leaving colorful splashes everywhere he went.

Mr. Pike scratched his head. "So there were no vandals. Just a very colorful dog."

The townspeople had been angry an hour earlier, but now they started to laugh. Then Ms. Kim had a wonderful idea. "Why don't we keep the paw prints?" she said. "Let's turn them into part of the Art Walk."

Kids grabbed brushes and turned each splash into something new. The red stripe on the bakery door became a cherry. The blue swirl on the hydrant became a wave. The dots outside the toy store became a field of flowers.

At the end of the day, a new sign was added to the Art Walk map: Follow the Pickles Trail. And Pickles, freshly washed, was the guest of honor.`,
  qs: [
    ['What does "vandals" mean?', ['People who damage property on purpose', 'People who paint murals', 'People who sell paint', 'People who walk dogs'], 0],
    ['Why was it important that every splash was low to the ground?', ['It suggested the "vandal" might not be a tall person at all', 'It showed the paint was cheap', 'It meant it had rained', 'It proved Mr. Pike did it'], 0],
    ['What did the rainbow order of the colors help Max figure out?', ['The paint came from Ms. Kim\'s paint table', 'A rainbow had appeared', 'Pickles liked red best', 'The bakery was painted first'], 0],
    ['How did the townspeople\'s feelings change in the story?', ['They went from angry to laughing and creative', 'They went from happy to angry', 'They stayed angry', 'They were scared the whole time'], 0],
    ['What is the author\'s purpose in having the town turn the splashes into art?', ['To show that a problem can become something good', 'To teach you to paint hydrants', 'To show dogs should not be pets', 'To explain how paint is made'], 0]
  ] },
{ level: 12, title: 'The Detective\'s Hardest Case', emoji: '🕵️', series: 'dokecase', text: `It started with a note slipped under Max's front door. The paper was folded into a tiny square, and on the outside, in neat block letters, it said: TO THE GREAT DETECTIVE.

Max unfolded it. Inside was a riddle:

I am kept in a box, but I am not a toy.
I am given away, but I always come back.
Find me where the stories sleep before the sun sets.

Max read it three times. Then he called Nora. "We have a new case," he said, "and this time, the mystery came looking for us."

They sat at Max's kitchen table and broke the riddle into pieces, the way good detectives do. Max wrote each line in his Clue Notebook.

"Line one," said Max. "Kept in a box, but not a toy. That could be jewelry, or letters, or photos."

"Line two," said Nora. "Given away but always comes back. Hmm. What do you give away that comes back?"

Max tapped his pencil. "A library book! You borrow it, but you always bring it back."

"And line three," said Nora, grinning. "Where the stories sleep. That's the library! Books sleep on the shelves."

"Before the sun sets," Max added. "The library closes at five. We have to hurry!"

They raced to the library with Sparko and Flutterbit. Mr. Chen, the librarian, smiled when he saw them, almost as if he'd been expecting them. "Looking for something?" he asked.

Max thought about the first line again. Kept in a box. In a library, what is kept in a box? Then he remembered: the return box! The metal box by the door where people drop books after hours.

Mr. Chen unlocked the return box. On top of the pile was a book Max knew very well: Dokemon of the Deep Sea. Tucked inside was another folded note.

This one said: Detectives find answers. Friends find each other. Go to the place where you solved your very first case.

Nora gasped. "Your first case! The missing Doke-Pod, in your laundry room!"

They ran all the way back to Max's house, down the hallway, and opened the laundry room door.

"SURPRISE!"

The room was filled with people. Mom and Dad. Theo and Clara. Mrs. Green, Mrs. Lopez, Captain Rosa, Ms. Kim, and even Mayor Bloom. Balloons covered the ceiling, and a big banner read: HAPPY ONE-YEAR DETECTIVE ANNIVERSARY!

Max was speechless. "You... you planned a mystery for me?"

Mom laughed. "Every time you solved a case, someone in town was helped. We wanted to say thank you, so we made a mystery that only the best detective could solve."

Then Nora handed Max a small wrapped box. Inside was a brand-new Clue Notebook with a gold cover. On the first page, everyone had written a message. Mrs. Green wrote, Thank you for saving my tulips. Clara wrote, Thank you for finding my treasure, and for being my friend.

Max looked around at all the smiling faces. He realized this was the most important clue of all: a detective is never really solving mysteries alone.

He opened his new notebook to the second page and wrote the first line: Case number one hundred. Solved with friends. Case closed.`,
  qs: [
    ['What was "kept in a box" at the library?', ['A library book in the return box', 'A toy', 'A gold coin', 'A birthday cake'], 0],
    ['What did "where the stories sleep" mean?', ['The library, where books sit on shelves', 'Max\'s bedroom', 'A campfire', 'The museum'], 0],
    ['Why did the town plan a mystery for Max?', ['To thank him for helping so many people', 'To trick him', 'Because they lost something', 'To make him late'], 0],
    ['Why did the last clue send Max to the laundry room?', ['His very first case happened there', 'It was the biggest room', 'Mom was doing laundry', 'Sparko lived there'], 0],
    ['What is the theme of this story?', ['A detective, and a person, is never truly alone when they have friends', 'Riddles are too hard', 'Libraries close early', 'Laundry is important'], 0]
  ] }
] }
);
SON_TRACK.rewards.push(
  ['🔍','Clue Hound',null,9], ['🦉','Professor Hoot',null,10], ['🦅','Sky Sleuth',null,11], ['🏅','Legend Lion',null,12]
);

/* ============================================================
   TOWER OF TALES — short read-aloud passages for the tower floors.
   step 1 (easiest) → 6 (hardest), per track. Original characters only.
   q: [question, [3 options], correctIndex]
   ============================================================ */
const TOWER_PASSAGES = {
  son: {
    1: [
      { id:'s1a', title:'The Red Hat', emoji:'🎩', text:`Biscuit has a red hat. The wind is big. Up, up goes the hat!

Biscuit runs and runs. The hat is in a tree. A bird sits on it. "Can I have my hat?" asks Biscuit. The bird hops off. Biscuit gets his hat.`,
        q:[['Where did the hat land?',['🌳 In a tree','🛁 In a tub','🚗 In a car'],0],['Who sat on the hat?',['🐦 A bird','🐶 A dog','🐸 A frog'],0]] },
      { id:'s1b', title:'Sparko Naps', emoji:'⚡', text:`Sparko is a little Dokemon. He likes to nap in the sun. Zap! A spark pops out of his tail.

Max sees the spark. "Wake up, Sparko!" Sparko opens one eye. He yawns. Then he jumps up to play tag with Max.`,
        q:[['What does Sparko like to do in the sun?',['😴 Nap','🏊 Swim','🎨 Paint'],0],['What game did they play?',['🏃 Tag','⚽ Soccer','🃏 Cards'],0]] },
      { id:'s1c', title:'The Big Box', emoji:'📦', text:`A big box sits by the door. Biscuit looks at it. Is it a bed? Is it a car?

Biscuit gets in the box. It is a ship! He sails to a far land. Then Mom calls, "Lunch time!" The ship is a box again.`,
        q:[['What did the box turn into?',['🚢 A ship','🏠 A house','✈️ A plane'],0],['Why did the game stop?',['🥪 It was lunch time','🌧️ It rained','😴 It was bed time'],0]] },
    ],
    2: [
      { id:'s2a', title:'The Lost Ball', emoji:'⚽', text:`Max kicked his ball too hard. It flew over the fence and into Mrs. Lin's yard.

"Oh no," said Max. "Her dog is big." Sparko sat on his head. "Bzzt!" Max took a deep breath and knocked on the gate. Mrs. Lin smiled. Her big dog came out with the ball in his mouth. He wagged his tail and dropped it at Max's feet.`,
        q:[['Why was Max worried?',['🐕 The dog was big','🌧️ It was raining','📚 He had homework'],0],['Who brought the ball back?',['🐕 The dog','🐱 A cat','👦 Max'],0]] },
      { id:'s2b', title:'Band Practice', emoji:'🎸', text:`Biscuit and his pals have a band. Biscuit plays the drums. Pip plays the horn. They practice in the garage after school.

Today the drums sound strange. Thump, clunk, thump. Biscuit looks inside the big drum. A tiny mouse waves at him! "I like your music," it squeaks. So the band lets the mouse shake the bells.`,
        q:[['What was inside the drum?',['🐭 A mouse','🧦 A sock','🍎 An apple'],0],['What did the mouse get to play?',['🔔 The bells','🥁 The drums','🎺 The horn'],0]] },
      { id:'s2c', title:'Snow Day', emoji:'❄️', text:`When Max woke up, the whole street was white. "Snow day!" he shouted.

He put on his boots, his coat. Two pairs of socks. Sparko did not like the cold. His sparks made little puffs of steam. Max built a snowman with a stick nose. Then he made a tiny snow Sparko to stand next to it.`,
        q:[['How did Max know it was a snow day?',['⬜ The street was white','📺 The TV said so','📞 Mom called'],0],['What did Max make next to the snowman?',['⚡ A tiny snow Sparko','🏰 A snow fort','🐶 A snow dog'],0]] },
    ],
    3: [
      { id:'s3a', title:'The Muddy Footprints', emoji:'👣', text:`Someone had tracked mud across the kitchen floor. Mom was not happy. "Who did this?" she asked.

Max looked closely at the footprints. They were small and round, with four little toes. "These are not people prints," he said. He followed them to the laundry basket. Inside, curled up on the clean towels, was a very muddy Biscuit.`,
        q:[['What clue showed it was not a person?',['🐾 The prints had four little toes','👟 The prints were huge','🧦 There was a sock'],0],['Where was Biscuit hiding?',['🧺 In the laundry basket','🛏️ Under the bed','🚿 In the shower'],0]] },
      { id:'s3b', title:'The Missing Cookie', emoji:'🍪', text:`Grandpa baked twelve cookies and set them on the window to cool. When he came back, there were only eleven.

Max grabbed his notebook. He found crumbs on the windowsill and a blue feather on the floor. "The thief has wings," Max said. Outside, a blue jay sat on the fence. It had a cookie in its beak. It looked very proud.`,
        q:[['How many cookies were left?',['1️⃣1️⃣ Eleven','🔟 Ten','1️⃣2️⃣ Twelve'],0],['Which clue told Max the thief could fly?',['🪶 A blue feather','👣 A footprint','🧤 A glove'],0]] },
      { id:'s3c', title:'Sparko\'s Big Jump', emoji:'⚡', text:`At the Dokemon park there was a jumping contest. The other Dokemon were bigger and stronger than Sparko.

"You can do it," Max whispered. Sparko crouched down low. He wiggled his tail until it glowed bright yellow. Then, ZAP, he pushed off the ground with a burst of sparks. He flew higher than anyone. The crowd cheered so loudly that Sparko's ears stood straight up.`,
        q:[['What did Sparko do before he jumped?',['✨ Wiggled his tail until it glowed','🍎 Ate a snack','😴 Took a nap'],0],['How did the crowd react?',['📣 They cheered loudly','😢 They cried','🚶 They left'],0]] },
    ],
    4: [
      { id:'s4a', title:'The Case of the Moving Gnome', emoji:'🧙', text:`Every morning, the garden gnome in Mr. Patel's yard was in a different spot. On Monday it was by the roses. On Tuesday it was next to the mailbox.

Max decided to watch the yard after dinner. He hid behind the hedge with Sparko and a flashlight. Just before dark, a raccoon crept out. It pushed the gnome across the grass, sniffed underneath it. Gobbled up the bugs hiding there. "Case closed," Max whispered.`,
        q:[['Why did the raccoon move the gnome?',['🐛 To eat the bugs under it','🎁 To steal it','🏠 To build a house'],0],['Where did Max hide?',['🌳 Behind the hedge','🏠 On the roof','🚗 In the car'],0]] },
      { id:'s4b', title:'The Quiet Library', emoji:'📚', text:`The town library was always quiet. But today it was too quiet. The librarian, Ms. Ruiz, could not find her reading glasses anywhere.

Max noticed that every book on the bottom shelf had been pushed in a little crooked. He knelt down and peeked behind them. There was a small gap behind the shelf. In it sat the glasses, next to three crayons and a squeaky toy. "I think a puppy has been hiding treasures here," Max said.`,
        q:[['What clue did Max notice first?',['📚 The bottom books were crooked','🔦 A light was on','🚪 The door was open'],0],['Who probably hid the glasses?',['🐶 A puppy','👩 Ms. Ruiz','⚡ Sparko'],0]] },
      { id:'s4c', title:'The Stormy Night', emoji:'⛈️', text:`Thunder rumbled over the house. The lights blinked off. Max's little sister started to cry.

"Don't worry," Max said. "Sparko can help." Sparko curled his tail into a circle and made it glow like a soft night light. The room filled with a warm yellow color. Max told a story about a brave Dokemon who was not afraid of thunder. By the end, his sister was fast asleep.`,
        q:[['How did Sparko help?',['💡 He glowed like a night light','🎵 He sang a song','🧸 He found a teddy bear'],0],['How did the story end?',['😴 His sister fell asleep','🌞 The sun came up','🚪 Mom came home'],0]] },
    ],
    5: [
      { id:'s5a', title:'The Secret Code', emoji:'🔐', text:`A strange note was taped to Max's locker. It said: "Meet me where the books are tallest. 3 o'clock." There was no name at the bottom, only a drawing of a lightning bolt.

Max thought about it all through math class. The tallest books in the school were the giant atlases in the library. At three o'clock he hurried there. His best friend Jada was waiting behind the atlas shelf, grinning. "Happy birthday, Detective," she said, holding out a cupcake with a lightning bolt on top.`,
        q:[['Where did the note tell Max to go?',['📚 Where the books are tallest','🏫 The gym','🍎 The lunchroom'],0],['Why did Jada leave the note?',['🎂 To surprise Max for his birthday','😠 To trick him','📝 To give him homework'],0]] },
      { id:'s5b', title:'The Vanishing Paint', emoji:'🎨', text:`The art room had six jars of paint on Friday. On Monday, the blue jar was completely empty. But nobody had painted anything blue.

Max studied the room carefully. The window was open a crack. There were tiny blue footprints on the sill. They led outside to the bird bath, where the water had turned bright blue. A family of sparrows was splashing in it happily. Someone had left the lid off. The rain had washed the paint right out the window.`,
        q:[['What happened to the blue paint?',['🌧️ Rain washed it out the window','🎨 A kid used it','🗑️ It was thrown away'],0],['Where did the blue water end up?',['🐦 In the bird bath','🚰 In the sink','🌊 In the ocean'],0]] },
      { id:'s5c', title:'The Trail of Leaves', emoji:'🍂', text:`On a windy autumn afternoon, Sparko disappeared from the backyard. Max searched under the porch and behind the shed. But there was no sign of him.

Then Max spotted something odd. A line of crispy leaves had small burn marks on them, as if each one had been touched by a tiny spark. Max followed the trail through the gate, across the park. Up the hill. At the very top, Sparko was chasing a bright orange kite that had broken free from its string.`,
        q:[['What clue helped Max find Sparko?',['🍂 Leaves with tiny burn marks','👣 Muddy prints','📢 Barking'],0],['What was Sparko chasing?',['🪁 A kite','🦋 A butterfly','⚽ A ball'],0]] },
    ],
    6: [
      { id:'s6a', title:'The Museum Mystery', emoji:'🏛️', text:`The class trip to the museum was going great. Then the guard made an announcement. A small golden statue was missing from the Egypt room! Everyone had to stay inside until it was found.

Max closed his eyes and pictured the room. He remembered a cleaning cart parked next to the glass case. When he opened his eyes, the cart was rolling past the gift shop. Max walked over and politely asked the janitor to check the bucket. Tucked inside a folded rag was the statue. The janitor looked shocked. "It must have fallen in while I was dusting," he said.`,
        q:[['What did Max remember about the Egypt room?',['🧹 A cleaning cart by the case','🐱 A cat statue','🚪 An open door'],0],['How did the statue go missing?',['🧽 It fell into the bucket while dusting','🦹 A thief grabbed it','🧒 A student broke it'],0]] },
      { id:'s6b', title:'The Whistling Attic', emoji:'🏚️', text:`Every night at exactly nine o'clock, a high whistling sound drifted down from Grandma's attic. Grandma said the house was simply old and full of noises, but Max was not convinced.

He climbed the narrow stairs with a flashlight and Sparko on his shoulder. The attic was dusty and cold. As the clock downstairs struck nine, the whistle began again. Max noticed that the round window was cracked. The evening wind was rushing through the gap. When the wind hit the crack, it whistled like a flute. Max taped the window shut. The house finally went silent.`,
        q:[['What was making the whistling sound?',['🌬️ Wind through a cracked window','👻 A ghost','🐦 A bird'],0],['Why did it always start at nine o\'clock?',['🌙 The evening wind came then','⏰ An alarm was set','📺 A TV show started'],0]] },
      { id:'s6c', title:'The Champion\'s Badge', emoji:'🏅', text:`The Dokemon Championship was only one day away, and Max's lucky badge had vanished from his backpack. Without it, he felt nervous and shaky.

Max retraced every step he had taken that day. He had stopped at the bakery, the park. The bike shop. At the bike shop, the owner remembered seeing something shiny caught in the spokes of a wheel. Sure enough, the badge was hanging from the tire of the bike Max had test-ridden. Max thanked him, pinned the badge back on. Realized something important. The badge was a nice reminder. But the skill had been his own all along.`,
        q:[['Where was the badge found?',['🚲 Caught in a bike wheel','🍞 In the bakery','🌳 Under a tree'],0],['What did Max realize at the end?',['💪 The skill was his own all along','🏅 He needed a new badge','🏃 He should quit'],0]] },
    ],
  },
  daughter: {
    1: [
      { id:'d1a', title:'The Smallest Egg', emoji:'🥚', text:`In the dragon nest, there were five eggs. Four were big and red. One was small and gray.

Wren picked up the small egg. It was warm. "Do not worry," she said. "I will keep you safe." That night, the small egg began to crack. Out came a tiny silver dragon. It sneezed a puff of blue smoke and licked Wren's nose.`,
        q:[['What color was the small egg?',['⚪ Gray','🔴 Red','🟢 Green'],0],['What did the baby dragon sneeze?',['💨 Blue smoke','🔥 Big flames','💧 Water'],0]] },
      { id:'d1b', title:'First Flight', emoji:'🪽', text:`Wren's dragon, Pebble, was ready to fly for the first time. He flapped his wings. He ran across the field. But he did not go up.

"Try again," said Wren. Pebble flapped harder. A gust of wind came over the hill. Up he went! He did a wobbly loop in the sky. Then he landed in a big pile of hay.`,
        q:[['What helped Pebble go up?',['🌬️ A gust of wind','🪜 A ladder','🎈 A balloon'],0],['Where did Pebble land?',['🌾 In a pile of hay','🌊 In a lake','🌳 In a tree'],0]] },
      { id:'d1c', title:'The Lost Key', emoji:'🗝️', text:`The door to the dragon barn was locked. The key was gone. The dragons were hungry.

Wren looked in her coat. She looked under the bench. Then she saw Pebble. He had a shiny thing in his mouth. "Pebble! You have the key!" Pebble dropped it in her hand. Wren opened the door. All the dragons cheered with happy roars.`,
        q:[['Why did Wren need the key?',['🐉 To feed the hungry dragons','🏠 To go home','📚 To get a book'],0],['Who had the key?',['🐲 Pebble','🧙 The teacher','🐦 A bird'],0]] },
    ],
    2: [
      { id:'d2a', title:'The Fire Lesson', emoji:'🔥', text:`At Ember Hollow Academy, the young dragons were learning to breathe fire. Pebble tried and tried. But only bubbles came out of his mouth.

The other dragons laughed. Wren patted his neck. "Every dragon is different," she said. Later, the school's water well caught fire from a stray spark. The fire dragons could not help, but Pebble blew a stream of bubbles over the flames. The fire fizzled out. Nobody laughed at him again.`,
        q:[['What came out when Pebble tried to breathe fire?',['🫧 Bubbles','🔥 Flames','❄️ Snow'],0],['How did Pebble save the day?',['🫧 He put out a fire with bubbles','🪽 He flew for help','🗣️ He yelled'],0]] },
      { id:'d2b', title:'The Map in the Wall', emoji:'🗺️', text:`While cleaning the old classroom, Wren found a loose stone in the wall. She pulled it out. Behind it was a rolled-up map tied with a ribbon.

The map showed the academy. But it had one extra room that Wren had never seen. It was marked with a small star under the library stairs. That afternoon, Wren and Pebble tapped on the wall under the stairs. It sounded hollow. They pushed. A hidden door creaked open.`,
        q:[['Where did Wren find the map?',['🧱 Behind a loose stone','📚 In a book','🛏️ Under her bed'],0],['How did they know the wall was hollow?',['👂 It sounded hollow when they tapped','👀 They saw a crack','🔑 They had a key'],0]] },
      { id:'d2c', title:'The Night Watch', emoji:'🌙', text:`Wren had been chosen to stand night watch on the castle tower. She was proud. But also a little scared of the dark.

Pebble curled up beside her, warm as a fireplace. The stars came out one by one. Around midnight, Wren heard a soft flapping sound. A lost baby owl landed on the wall, shivering. Wren tucked it under her cloak until morning, when its mother swooped down to bring it home.`,
        q:[['How did Wren feel about the night watch?',['😊😨 Proud but a little scared','😴 Sleepy and bored','😠 Angry'],0],['What landed on the wall?',['🦉 A baby owl','🐉 A dragon','🦇 A bat'],0]] },
    ],
    3: [
      { id:'d3a', title:'The Frozen Lake', emoji:'🧊', text:`The winter had been so cold that the lake beside Ember Hollow froze solid. The headmaster announced a skating day. Everyone rushed outside.

Wren noticed that the ice near the old dock looked darker than the rest. She remembered that dark ice was thinner and more dangerous. Just then, a younger student skated toward the dock. "Stop!" Wren shouted. Pebble flew over and landed in front of the boy, spreading his wings like a wall. A moment later, a crack zigzagged across the dark ice right where he would have been.`,
        q:[['Why was the dark ice dangerous?',['🧊 It was thinner','🔥 It was hot','💧 It was slippery'],0],['How did Pebble stop the boy?',['🪽 He spread his wings like a wall','🔥 He breathed fire','🎵 He sang'],0]] },
      { id:'d3b', title:'The Borrowed Spell Book', emoji:'📕', text:`Wren borrowed a spell book from the library to study for her test. When she opened it at home, a folded letter slipped out. It was written by a student from one hundred years ago.

The letter said: "If you find this, look for my dragon's scale under the third step of the tower." Wren's heart raced. The next morning, she counted the tower steps and lifted the third one. Underneath was a shimmering green scale and a tiny note that read, "Be kind to your dragon. It will always come back to you."`,
        q:[['Who wrote the letter?',['📜 A student from long ago','🧙 Wren\'s teacher','🐉 Pebble'],0],['What message was under the step?',['💚 Be kind to your dragon','📚 Study hard','🏃 Run fast'],0]] },
      { id:'d3c', title:'The Racing Contest', emoji:'🏁', text:`Every spring, the riders of Ember Hollow raced their dragons around three mountain peaks. Wren and Pebble had never won. Pebble was smaller than the other dragons.

This year, Wren watched the weather. She learned that the wind blew hardest between the second and third peaks. It blew in the afternoon. During the race, the big dragons flew straight into the wind. Wren steered Pebble up high, where the wind pushed from behind. They zoomed past everyone. They crossed the finish line first!`,
        q:[['Why had Wren never won before?',['🐲 Pebble was smaller','😴 She was late','🌧️ It always rained'],0],['What was Wren\'s secret this year?',['🌬️ She used the wind to push them','🍎 She fed Pebble apples','🗺️ She took a shortcut through a cave'],0]] },
    ],
    4: [
      { id:'d4a', title:'The Whispering Cave', emoji:'🕳️', text:`Deep in the forest, there was a cave that the villagers called the Whispering Cave. They said strange voices floated out of it at night. No one dared to go near it.

Wren wanted to know the truth. She and Pebble crept to the entrance with a lantern. Inside, the cave walls were covered in hundreds of tiny holes. When the night wind blew across the holes, it made soft sounds that echoed like whispers. Wren laughed with relief. The next day, she explained it to the villagers. They named the cave the Singing Cave instead.`,
        q:[['What really made the whispering sound?',['🌬️ Wind blowing across tiny holes','👻 Ghosts','🦇 Bats talking'],0],['What did the villagers rename the cave?',['🎶 The Singing Cave','🌙 The Moon Cave','🐉 The Dragon Cave'],0]] },
      { id:'d4b', title:'The Stolen Crown', emoji:'👑', text:`On the morning of the royal festival, the queen's crown disappeared from its velvet pillow. Guards searched the entire castle. But they found nothing.

Wren noticed that the pillow had a few sparkling threads on it, like the shiny thread magpies collect for their nests. She remembered that a magpie family lived in the tall clock tower. Pebble flew her to the top. There, woven into a messy nest, was the golden crown surrounded by buttons and coins. Wren traded the magpies a bag of bright beads. They happily let her take the crown back.`,
        q:[['What clue did Wren find on the pillow?',['✨ Sparkling threads','👣 A footprint','🧤 A glove'],0],['How did Wren get the crown back?',['📿 She traded beads with the magpies','⚔️ She fought the birds','🧙 She used a spell'],0]] },
      { id:'d4c', title:'The Sick Dragon', emoji:'🤒', text:`One morning, Pebble would not eat his breakfast. His scales had turned pale. His tail drooped on the floor. Wren rushed him to the academy healer.

The healer looked in Pebble's mouth and listened to his breathing. "He swallowed something that is stuck," she said. She mixed a warm drink of honey and mint. Pebble drank it slowly. A few minutes later, he gave a giant hiccup. Out flew Wren's missing silver bracelet. Pebble's scales turned bright again. He licked Wren's face as if to say sorry.`,
        q:[['How did Wren know Pebble was sick?',['🍽️ He would not eat and his scales were pale','🤧 He sneezed fire','🗣️ He told her'],0],['What had Pebble swallowed?',['💍 Wren\'s silver bracelet','🪨 A rock','🔑 A key'],0]] },
    ],
    5: [
      { id:'d5a', title:'The Ancient Library', emoji:'🏛️', text:`Under Ember Hollow Academy, there was an old library. Students were not allowed inside. The headmaster kept the only key on a chain around his neck.

One evening, Wren heard Pebble growling at the library door. A thin line of purple light glowed under it. Wren ran to find the headmaster. He unlocked the door with a worried frown. Inside, one book had fallen open on the floor. Tiny purple sparks were floating out of its pages. "This is a book of storms," the headmaster said as he closed it. "If it had stayed open all night, lightning would have filled the castle." He thanked Wren and Pebble for being so alert.`,
        q:[['What warned Wren something was wrong?',['🐲 Pebble growled at the door','🔔 A bell rang','📢 Someone screamed'],0],['What would have happened if the book stayed open?',['⚡ Lightning would fill the castle','📚 All the books would fly away','🌊 The castle would flood'],0]] },
      { id:'d5b', title:'The Mountain Rescue', emoji:'🏔️', text:`A sudden snowstorm trapped a group of travelers on the side of Frostfang Mountain. The village sent a message to the academy asking for dragon riders to help.

Wren knew Pebble could fly through narrow spaces that larger dragons could not reach. The wind was fierce. Snow stung her face. But she kept her eyes on the faint glow of the travelers' campfire. Pebble landed on a tiny ledge beside them. One by one, Wren carried the travelers down to safety. By sunrise, everyone was warm and fed in the village hall. The mayor gave Wren a medal shaped like a snowflake.`,
        q:[['Why was Pebble good for this rescue?',['🐲 He could fit through narrow spaces','🔥 He breathed the hottest fire','💪 He was the strongest'],0],['What helped Wren find the travelers?',['🔥 The glow of their campfire','📢 Their shouting','🗺️ A map'],0]] },
      { id:'d5c', title:'The Two Moons', emoji:'🌗', text:`According to an old legend, once every hundred years, two moons appear over the Silver Sea. The dragons of the deep ocean rise to the surface to sing. Most people believed it was only a story.

Wren had calculated the dates in the old star charts. She was certain tonight was the night. She and Pebble flew to the cliffs above the sea and waited. Just after midnight, a second, paler moon rose beside the first. The water began to shimmer. Dozens of enormous sea dragons lifted their heads above the waves. Their song was so beautiful that Pebble hummed along, and Wren wrote down every note so the academy would believe her.`,
        q:[['How did Wren know which night to go?',['⭐ She studied the old star charts','📰 It was in the news','🧙 A teacher told her'],0],['Why did Wren write down the notes?',['📝 So the academy would believe her','🎵 To sing in a concert','📚 For homework'],0]] },
    ],
    6: [
      { id:'d6a', title:'The Dragon Council', emoji:'⚖️', text:`For the first time in fifty years, the Dragon Council called a meeting at Ember Hollow. The great dragons were arguing about whether humans should still be allowed to ride them.

The eldest dragon, an enormous golden creature with cloudy eyes, asked whether any student could prove that riders truly cared for their dragons. Wren stepped forward nervously. She described how Pebble had saved the boy on the frozen lake and how she had sat with him all night when he was sick. Then Pebble spoke for the first time in front of the council. "She listens to me," he said simply. The golden dragon lowered its head. "Then the partnership continues," it declared. The council agreed.`,
        q:[['What were the dragons arguing about?',['🧍🐉 Whether humans should still ride them','🍖 What to eat','🏔️ Where to live'],0],['What convinced the council?',['💬 Pebble said that Wren listens to him','🏅 Wren showed her medal','🔥 A fire contest'],0]] },
      { id:'d6b', title:'The Shattered Compass', emoji:'🧭', text:`Wren's grandmother had given her a magic compass. It always pointed toward whatever its owner needed most. During a training flight, it slipped from her pocket. It shattered on the rocks below.

Wren was heartbroken. She gathered every piece. For three evenings, she fit them back together while Pebble held the tiny parts steady in his claws. When the last piece clicked into place, the needle spun wildly. Then it stopped. It was pointing straight at Pebble. Wren laughed through her tears. The compass had been right all along. The thing she needed most was the friend who had helped her fix it.`,
        q:[['What was special about the compass?',['🧭 It pointed to what the owner needed most','🌙 It glowed at night','🔊 It could talk'],0],['Why did the needle point at Pebble?',['💛 Pebble was what Wren needed most','🧲 Pebble had a magnet','🐲 Pebble was hungry'],0]] },
      { id:'d6c', title:'The Last Exam', emoji:'🎓', text:`To finish the first year at Ember Hollow, every student had to pass a final test. They had to fly through the Maze of Mirrors without getting lost. The mirrors showed fake paths. Many riders flew in circles for hours.

Before the test, Wren noticed something. The real paths had a soft breeze. The mirror paths had perfectly still air. She tied a thin ribbon to Pebble's horn. When the ribbon fluttered, they knew the path was real. Other students grew frustrated, but Wren and Pebble moved steadily through the maze. They burst into the sunlight in record time. The headmaster announced that Wren had earned the title of Junior Dragon Master.`,
        q:[['How could Wren tell a real path from a mirror?',['🎀 The ribbon fluttered in the breeze','🔦 She used a light','🗺️ She had a map'],0],['What title did Wren earn?',['🎓 Junior Dragon Master','👑 Queen of Dragons','🏆 Fastest Flyer'],0]] },
    ],
  },
};
// Riddle floors: read the riddle out loud, then pick the answer.
const TOWER_RIDDLES = {
  son: [
    ['I have a face and two hands, but no arms or legs. What am I?',['⏰ A clock','🧸 A teddy bear','🪞 A mirror'],0],
    ['I am full of holes, but I can still hold water. What am I?',['🧽 A sponge','🪣 A bucket','🧦 A sock'],0],
    ['The more you take, the more you leave behind. What are they?',['👣 Footsteps','🍪 Cookies','🎈 Balloons'],0],
    ['I have keys, but I cannot open a door. What am I?',['🎹 A piano','🚪 A gate','🔒 A lock'],0],
    ['I go up and down but never move. What am I?',['🪜 Stairs','🛗 An elevator','🎈 A balloon'],0],
    ['What has to be broken before you can use it?',['🥚 An egg','📱 A phone','🪑 A chair'],0],
  ],
  daughter: [
    ['I can fly without wings and cry without eyes. Wherever I go, darkness follows me. What am I?',['☁️ A cloud','🦇 A bat','🌙 The moon'],0],
    ['I have cities but no houses, forests but no trees, and water but no fish. What am I?',['🗺️ A map','🌍 The world','📖 A book'],0],
    ['What can you catch but never throw?',['🤧 A cold','⚾ A ball','🐟 A fish'],0],
    ['I speak without a mouth and hear without ears. I come alive with the wind. What am I?',['🗣️ An echo','🎐 A wind chime','📻 A radio'],0],
    ['The more of me there is, the less you can see. What am I?',['🌑 Darkness','🔊 Noise','💡 Light'],0],
    ['I have a neck but no head, and I wear a cap. What am I?',['🍾 A bottle','🦒 A giraffe','🧢 A hat'],0],
  ],
};
// difficulty steps, ordered by measured reading level (easiest first)
const TOWER_STEPS = {
  son:      { 1:['s1a','s1b','s1c'], 2:['s2a','s2b','s2c'], 3:['s3a','s3b','s3c'], 4:['s4a','s4b','s4c'], 5:['s5a','s5b','s5c'], 6:['s6a','s6b','s6c'] },
  daughter: { 1:['d1a','d1c','d1b'], 2:['d2b','d4a','d2c'], 3:['d4c','d2a','d6b'], 4:['d3c','d3a','d3b'], 5:['d5a','d6c','d4b'], 6:['d5b','d6a','d5c'] }
};

/* ============================================================
   GIANNA — ranks 9–12: "Dragon Academy: The Sky Saga" (original).
   Continues Wren & Pebble's story after Lord Vex's return.
   Cast: Wren + Pebble (earth dragon), Mira + Ripple (water), Tobin + Blaze (fire),
   Fen + Breeze (storm), Master Oona, Lord Vex, Thunder (Vex's lost wind dragon).
   The Sunny Day Club: Rosie, Priya, Jules, Lena and little Daisy.
   Built a step past rank 8: longer chapters, richer words, and questions
   about inference, character change, cause and effect, and word meaning.
   ============================================================ */
DAUGHTER_TRACK.levels.push(
{ n: 9, title: 'Sky Marshal', kind: 'story', stories: [
{ title: 'A Feather on the Wind', emoji: '🪶', series: 'quest', text: `The first cold wind of autumn arrived at Skyfire Academy on a Tuesday, and it brought something with it.

Wren was crossing the courtyard with Pebble when a long silver-blue feather spun down from the sky and landed at her feet. It was nearly as long as her arm, and its edges shimmered like the inside of a seashell.

"That's not from a bird," Pebble said through their bond, his voice humming warmly in her mind. "No bird is that big."

Wren carried the feather straight to the Hall of Records, where Lord Vex now spent his mornings sorting old scrolls. Ever since he had returned to the academy, he had worked quietly and patiently, as though he were trying to repair something that couldn't be seen.

When Vex saw the feather, the scroll in his hands dropped to the floor.

"Where did you find this?" he whispered.

"It fell out of the sky," Wren said. "Do you know what it is?"

Vex took the feather carefully, as if it might shatter. "Wind dragons have feathers along the edges of their wings," he said slowly. "And this pattern, with the silver tip and the three blue stripes, belonged to only one dragon I've ever known." He swallowed hard. "Thunder."

Wren felt Pebble go very still beside her. Thunder was the wind dragon who had flown away from Vex long ago, when Vex had cared more about winning than about his partner.

"But that was years ago," Wren said. "Could he still be nearby?"

"Wind dragons live for centuries," Vex replied. "And a feather this fresh fell recently. The autumn wind blows from the north, past the Floating Islands." His hands were trembling. "He could be out there right now."

That afternoon, Wren asked Master Oona for permission to search.

Master Oona studied Wren over her spectacles for a long moment. "The Floating Islands are dangerous in autumn," she said. "The winds change direction without warning. You'll need a crew."

Mira and Ripple volunteered immediately. Tobin and Blaze joined because, as Tobin said, "someone has to bring snacks." Fen and Breeze came because Breeze could feel the weather changing before anyone else.

Then Wren turned to Lord Vex. "You should come too," she said.

Vex shook his head. "Thunder may not want to see me. I hurt him badly."

"Maybe," Wren agreed gently. "But if you never try, you'll never know."

Vex looked down at the feather for a long time. Finally, he nodded once.

That night, Wren couldn't sleep. She stood at her window, watching the northern sky. Far away, above the clouds, something long and silver flickered in the moonlight and then vanished.

"Did you see that?" she whispered.

"I saw it," Pebble said. "Tomorrow, we fly."`,
  qs: [
    ['Why did Lord Vex drop his scroll when he saw the feather?', ['He recognized it as one of Thunder\'s feathers', 'He was afraid of birds', 'The feather was very heavy', 'He thought Wren had stolen it'], 0],
    ['What clue told Vex the feather fell recently?', ['It was fresh', 'It was covered in snow', 'It was wrapped in a scroll', 'It smelled like smoke'], 0],
    ['Why did Master Oona say Wren needed a crew?', ['The winds near the Floating Islands change without warning', 'Wren was too young to fly alone', 'Pebble was sick', 'The islands were full of pirates'], 0],
    ['What does "trembling" mean in this story?', ['Shaking slightly because of strong feelings', 'Laughing quietly', 'Standing perfectly still', 'Holding something tightly'], 0],
    ['What does Wren\'s advice to Vex show about her?', ['She believes people should try to fix their mistakes', 'She wants to fly alone', 'She does not trust Vex', 'She thinks Thunder is dangerous'], 0]
  ] },
{ title: 'The Floating Islands', emoji: '🏝️', series: 'quest', text: `The crew left at sunrise, flying north in a long line. Breeze led the way, because a storm dragon can taste the wind the way other creatures taste soup.

After two hours, the Floating Islands appeared through the clouds. There were dozens of them, some as small as a cottage and others as large as a village, drifting slowly through the sky like enormous green boats. Waterfalls poured off their edges and turned to mist before they reached the ground.

"Wow," breathed Mira. Ripple splashed happily through a cloud.

They landed on the largest island, where a small stone house stood beside a grove of twisted trees. An old woman with a long white braid was hanging laundry on a line. She didn't seem the least bit surprised to see six dragons land in her garden.

"Visitors," she said. "How unusual. I'm Grandmother Willa, keeper of the islands. What brings young riders this far north?"

Wren explained about the feather and Thunder. When she finished, Grandmother Willa's face grew serious.

"A silver wind dragon has been seen around here," she said. "But you're not the only ones looking for wind dragons this season."

"What do you mean?" asked Fen.

Grandmother Willa pointed toward the horizon, where a dark shape hung in the clouds. At first, Wren thought it was another island. Then she noticed the masts, the patched sails, and the huge net dangling beneath it.

"A sky ship," Tobin said. "I thought those were only in stories."

"Sky pirates," said Grandmother Willa grimly. "Their captain is a woman called Gale. She captures wild wind dragons and sells them to people who want fast, obedient beasts." She shook her head. "Three wind dragons have disappeared since summer."

Lord Vex had been silent the entire flight. Now his jaw tightened. "Obedient," he repeated quietly. "That's exactly what I once wanted Thunder to be."

Wren glanced at him. He looked angry, but not at the pirates. He looked angry at his younger self.

"We have to warn the wind dragons," said Mira. "Or find them before Gale does."

"Wind dragons don't trust strangers," Grandmother Willa warned. "Especially not now. They hide in the high currents, where the air is too thin for most dragons to follow."

Breeze rumbled, and Fen translated. "Breeze says she can fly in thin air. She was born in a storm, after all."

"Then Breeze will scout," Wren decided. "The rest of us will find out where the pirates are going."

That evening, the crew camped beneath the twisted trees. Grandmother Willa served them bowls of hot barley soup, and Blaze kept the fire burning brightly. Above them, the sky ship drifted closer, its lanterns glowing like hungry yellow eyes.

Wren lay awake, listening to the wind. Somewhere up there, Thunder was hiding. She hoped they could reach him first.`,
  qs: [
    ['How are the Floating Islands described?', ['Like enormous green boats drifting through the sky', 'Like piles of rocks on the ground', 'Like icebergs in the sea', 'Like castles made of clouds'], 0],
    ['Why does Captain Gale capture wind dragons?', ['To sell them to people who want fast, obedient beasts', 'To protect them from storms', 'To bring them home to the academy', 'To teach them to read'], 0],
    ['Why did Lord Vex look angry?', ['He was angry at his younger self for wanting an obedient dragon', 'He was angry at Wren', 'He did not like the soup', 'He was tired from flying'], 0],
    ['Why was Breeze chosen to scout?', ['She can fly in thin air because she was born in a storm', 'She is the biggest dragon', 'She can breathe fire', 'She knows Captain Gale'], 0],
    ['What does the phrase "lanterns glowing like hungry yellow eyes" make the reader feel?', ['That the pirate ship is dangerous and watching them', 'That the ship is warm and friendly', 'That it is morning', 'That the pirates are asleep'], 0]
  ] },
{ title: 'Mira Reads the Wind', emoji: '🌬️', series: 'quest', text: `By morning, the sky ship had vanished into a wall of clouds, and Breeze returned from her scouting flight exhausted.

"She found wind dragon tracks," Fen reported. "Trails of warm air that wind dragons leave behind. But the trails loop and twist everywhere. She couldn't follow them."

Tobin groaned. "So we're stuck."

Mira, however, was staring at the sky with a strange expression. She pulled a notebook from her bag and began scribbling furiously.

"What are you doing?" Wren asked.

"Ripple and I have been studying currents all year," Mira explained without looking up. "Water currents, mostly. But air moves the same way. It flows like an invisible river." She held up her notebook. On the page, she had drawn swirling arrows across a map of the islands. "Wind dragons don't fly randomly. They ride the strongest currents, the way fish swim downstream to save energy."

Grandmother Willa leaned over the notebook and raised her eyebrows. "That's remarkable, child. The old island keepers knew the currents by heart, but nobody has written them down in a hundred years."

Mira blushed. "I just noticed patterns."

Wren grinned. Mira had always been the quiet one, the rider who double-checked everyone's saddle straps and remembered every lesson. Wren had sometimes worried that Mira felt overlooked next to louder friends like Tobin. Now Mira was the only one who knew what to do.

"If the currents meet here," Mira continued, tapping a spot on her map, "then every wind dragon trail eventually passes the Needle." She pointed to a tall, thin island that rose above the others like a stone finger.

"And so would anyone hunting them," said Lord Vex.

They flew to the Needle, following Mira's directions exactly. Twice, Tobin wanted to take a shortcut through a cloud bank, and twice Mira said firmly, "No. The current there flows backward. We'd lose an hour." Both times, she was right.

When they reached the Needle, they found it crowded with nests built from silver feathers and woven grass. Most were empty and cold. But in the highest nest, wedged into a crack in the rock, they found something that made Lord Vex fall to his knees.

It was a small wooden carving of a dragon, worn smooth by time. Carved into its base were two words: VEX AND THUNDER.

"I made this," Vex whispered. "When I was twelve. I gave it to Thunder on the day we bonded." His voice cracked. "He kept it. All these years, he kept it."

Nobody spoke. Even Blaze lowered his head.

Then Ripple suddenly hissed, and Mira grabbed Wren's arm. Far below, a shadow slid out of the clouds: the sky ship, with its enormous net dangling beneath it.

Inside the net, something silver was struggling.

"Thunder," Vex breathed.

Mira snapped her notebook shut. "The ship is riding the eastern current," she said quickly. "It will pass the Broken Arch in one hour. If we leave right now, we can get there first."

Wren looked at her friend with admiration. "Lead the way, Navigator."`,
  qs: [
    ['How did Mira figure out where the wind dragons fly?', ['She noticed that they ride air currents like fish swim downstream', 'She asked the pirates', 'She followed Blaze\'s smoke', 'She read an old letter'], 0],
    ['Why did Mira refuse Tobin\'s shortcut?', ['The current there flowed backward and would slow them down', 'She was afraid of clouds', 'Tobin was lost', 'Ripple was too tired'], 0],
    ['What did the wooden carving prove?', ['Thunder had kept Vex\'s gift all these years', 'Thunder hated Vex', 'The pirates had been to the nest', 'Mira had carved it'], 0],
    ['How did Wren\'s feelings about Mira change in this story?', ['She saw that quiet Mira was the only one who knew what to do', 'She became jealous of Mira', 'She thought Mira was too bossy', 'She stopped trusting Mira'], 0],
    ['What does "Navigator" mean when Wren calls Mira that?', ['The person who plans the route', 'The person who carries the food', 'The fastest flyer', 'The person who fixes saddles'], 0]
  ] },
{ title: 'The Broken Arch', emoji: '🌉', series: 'quest', text: `The Broken Arch was exactly what its name suggested: two enormous stone pillars that had once been joined by a bridge, with a jagged gap between them where the middle had crumbled away. The eastern current rushed through the gap like water through a pipe.

"The ship has to pass through there," Mira said. "It's the only way through the current without tearing the sails."

The crew hid behind the pillars and waited. Wren's heart pounded so loudly she was sure the pirates would hear it.

"We need a plan," Tobin whispered. "We can't fight a whole pirate ship."

"We don't need to fight it," Wren said slowly, thinking hard. "We only need to free Thunder." She turned to Pebble. "Can you move the stones in the arch?"

Pebble's eyes glowed amber, the way they did whenever he used his earth magic. "A little. Not enough to break the ship. But enough to shake it."

"Then here's what we'll do," Wren said, and explained.

Ten minutes later, the sky ship glided toward the arch. It was even larger up close, with patched gray sails and a figurehead shaped like a screaming eagle. Pirates with long hooks lined the rails. At the wheel stood a tall woman in a coat covered with dragon scales, her silver hair whipping in the wind.

"Captain Gale," whispered Lord Vex.

As the ship entered the gap, Pebble pressed his claws against the stone. The pillars groaned. Pebbles and dust rained down onto the deck. The ship lurched sideways, and the pirates stumbled and shouted.

"Now!" Wren called.

Ripple sprayed a thick curtain of mist across the deck so the pirates couldn't see. Blaze dove beneath the ship, his warm breath creating an updraft that pushed the hull higher and higher until the net beneath it swung wildly. Fen and Breeze swooped down and slashed through the ropes with Breeze's lightning-sharp claws.

The net tore open. Three wind dragons tumbled free, unfolding their feathered wings. Two of them fled instantly into the clouds.

The third, the silver one, hesitated in midair.

Thunder was enormous, even larger than Breeze, with three blue stripes on every wing feather. He turned his great head and looked directly at Lord Vex, who hovered nearby on the back of Fen's dragon.

Vex held up the wooden carving with shaking hands. "I'm sorry," he called across the wind. "I was wrong. I didn't deserve you then. I'm trying to deserve you now."

For one long breath, Thunder stared at him. Then the wind dragon let out a low, sad cry and soared away into the clouds without looking back.

Vex lowered the carving. His face was wet, but he didn't look broken. "He's free," he said quietly. "That matters more than what he thinks of me."

Behind them, Captain Gale's voice rang out across the mist, cold as ice. "You've cost me three dragons, children. I won't forget it."

The sky ship turned and disappeared into the clouds. Wren knew, deep in her bones, that they would see Captain Gale again.`,
  qs: [
    ['Why did the crew wait at the Broken Arch?', ['The ship had to pass through the gap in the current', 'It was the pirates\' home', 'It was the safest place to sleep', 'Thunder lived there'], 0],
    ['What was Wren\'s main goal in her plan?', ['To free Thunder without fighting the whole ship', 'To capture Captain Gale', 'To steal the ship', 'To break the arch'], 0],
    ['How did each dragon help free the wind dragons?', ['They each used their own special power as part of the team', 'They all breathed fire at once', 'Only Pebble did the work', 'They waited for Master Oona'], 0],
    ['Why does Vex say "That matters more than what he thinks of me"?', ['He now cares more about Thunder\'s freedom than his own feelings', 'He is angry at Thunder', 'He wants the carving back', 'He wants to chase the pirates'], 0],
    ['What does "lurched" mean in this story?', ['Moved suddenly and unsteadily', 'Floated gently', 'Stopped completely', 'Turned around slowly'], 0]
  ] },
{ title: 'The Bake Sale Mix-Up', emoji: '🧁', series: 'club', text: `The Sunny Day Club had a big goal: they wanted to raise enough money to buy a new bench for the bus stop on Maple Street, where Mrs. Abernathy waited every morning with her bad knee.

"A bake sale," Priya announced at the meeting. "Everyone loves a bake sale."

So on Friday night, the club gathered in Rosie's kitchen. Jules made lemon bars. Lena made chocolate chip cookies. Priya made her famous banana bread. Rosie was in charge of the cupcakes, and Daisy, who was five, was in charge of sprinkles.

It was a cheerful, messy evening. Flour drifted across the counters like snow. Daisy put sprinkles on everything, including, at one point, the cat.

On Saturday morning, they set up a table at the farmers' market. Their sign was covered in glitter. Their treats looked beautiful. The first customer, a tall man with a fishing hat, bought two of Rosie's cupcakes and took a big bite.

His face scrunched up. He coughed. He made a sound like a surprised goose.

"Is something wrong?" Rosie asked nervously.

"It's very... salty," the man said politely, setting the cupcake down.

Rosie tasted one. It was horrible. It tasted like the ocean. Her stomach dropped as she realized what had happened: the sugar and salt were kept in identical jars, and she had grabbed the wrong one.

Her face turned bright red. Her first thought was to hide the cupcakes under the table and pretend nothing had happened. Nobody needed to know. Besides, Daisy had decorated them so nicely.

But then she looked at the man in the fishing hat, who had paid good money for something terrible.

Rosie took a deep breath. "I'm really sorry," she said. "I used salt instead of sugar by mistake. Here's your money back, and please take a lemon bar instead. They're delicious."

The man laughed. "Honestly? That's the most honest thing I've heard all week." He took the lemon bar and dropped the refund into the donation jar anyway.

Rosie made a new sign in big letters: OOPS CUPCAKES - THEY TASTE LIKE THE SEA - FREE TO ANYONE BRAVE. Then she set them at the end of the table.

To everyone's surprise, the Oops Cupcakes became the most popular thing at the market. Kids dared each other to try them. Grown-ups laughed and took pictures of the sign. And almost everyone who stopped for a free salty cupcake ended up buying a cookie or a slice of banana bread afterward.

By noon, the club had sold out of everything. They had raised enough money for the bench and some extra for a small plaque.

That afternoon, Priya opened the club notebook and wrote down the lesson of the day: When you make a mistake, say so. People trust you more, not less.

Underneath it, in crayon, Daisy added one more rule: Label the jars.`,
  qs: [
    ['Why did the club hold a bake sale?', ['To buy a new bench for Mrs. Abernathy\'s bus stop', 'To buy a new tree house', 'To pay for a trip', 'To buy toys for Daisy'], 0],
    ['What caused the cupcakes to taste salty?', ['The sugar and salt were in identical jars', 'Daisy added salt on purpose', 'The oven was too hot', 'Lena changed the recipe'], 0],
    ['What was Rosie\'s first idea, and what did she do instead?', ['She wanted to hide the mistake, but she told the truth', 'She wanted to quit, but she kept selling', 'She wanted to blame Daisy, but she blamed Jules', 'She wanted to cry, but she laughed'], 0],
    ['Why did the Oops Cupcakes help the sale?', ['They made people curious and they stayed to buy other treats', 'They were secretly delicious', 'They were very expensive', 'They were the only treats left'], 0],
    ['What is the main lesson of the story?', ['Being honest about mistakes builds trust', 'Never bake anything', 'Always sell cupcakes first', 'Little sisters should stay home'], 0]
  ] }
] },
{ n: 10, title: 'Storm Warden', kind: 'story', stories: [
{ title: 'The Silver Shadow', emoji: '🌫️', series: 'quest', text: `For two weeks after Wren's escape from the sky ship, nothing unusual happened at Skyfire Academy. Classes continued. The autumn leaves turned gold and red. Lord Vex returned to his scrolls and said very little about Thunder.

But Wren noticed things.

She noticed that every morning, at exactly the same time, a long silver shadow passed over the academy's highest tower. She noticed that the shadow always circled twice before vanishing north. And she noticed that every morning, at exactly that time, Lord Vex was standing on the tower balcony, looking up.

"Thunder is visiting," Pebble said through their bond one morning as they watched from the courtyard. "He's checking on Vex."

"Then why doesn't he land?" Wren asked.

"Trust doesn't grow in a day," Pebble replied. "You know that. You once told me the same thing about seeds."

Wren smiled. She had said that, years ago, when Pebble was a tiny dragon afraid of the dark.

That afternoon, she found Lord Vex in the Hall of Records, carefully copying an old map. "Thunder comes every morning," she said. "Have you tried calling him?"

Vex shook his head without looking up. "When we were young, I always called him. I called him when I wanted to race, when I wanted to show off, when I wanted to win. I never once waited for him to come to me." He set down his pen. "So now I wait."

"Every day?"

"Every day," Vex said. "For as long as it takes."

Wren thought about that for a long time afterward. It seemed like the hardest thing in the world: to want something badly and still be patient.

The next morning, she woke before dawn and climbed the tower stairs. Vex was already there, wrapped in a gray cloak, holding a basket of fresh mountain berries. Wind dragons, Wren had learned from the library, loved mountain berries more than anything.

"May I wait with you?" she asked.

Vex nodded, and they sat together in silence as the sky turned from black to purple to pink.

At sunrise, the silver shadow appeared. Thunder circled once. Twice. Then, for the first time, he flew lower. He passed so close that the wind from his wings blew Wren's hair across her face, and she saw his enormous blue eyes fix on the basket.

Vex didn't move. He didn't call out. He simply set the basket on the stone railing and stepped back.

Thunder hovered. He looked at the berries, and then at Vex, for a long, long time.

Then he snatched the basket in his claws and flew away.

Wren expected Vex to look disappointed. Instead, he was smiling, the first real smile she had ever seen on his face.

"He took it," Vex said softly. "Tomorrow, I'll bring two baskets."

Far away, beyond the northern mountains, dark clouds were gathering, but neither of them noticed.`,
  qs: [
    ['What did Wren notice every morning?', ['A silver shadow circled the tower while Vex watched', 'Pirates landed in the courtyard', 'Pebble flew away', 'Leaves fell from the sky'], 0],
    ['How has Vex changed from when he was young?', ['He used to call Thunder whenever he wanted something; now he waits patiently', 'He used to be patient; now he is impatient', 'He used to love dragons; now he hates them', 'He has not changed at all'], 0],
    ['Why did Vex bring mountain berries?', ['Wind dragons love mountain berries more than anything', 'He was hungry', 'Wren asked him to', 'Berries keep pirates away'], 0],
    ['Why was Vex smiling even though Thunder flew away?', ['Taking the basket was a small step toward trust', 'He was glad Thunder left', 'He had played a trick on Thunder', 'He was thinking about breakfast'], 0],
    ['What does the last sentence hint will happen next?', ['A storm or danger is coming', 'Thunder will move into the academy', 'Winter is over', 'Vex will leave the academy'], 0]
  ] },
{ title: 'The Pirates Strike Back', emoji: '🏴‍☠️', series: 'quest', text: `The storm arrived on the night of the Harvest Lantern Festival.

Skyfire Academy glowed with hundreds of paper lanterns, and students and dragons filled the courtyard, eating honey cakes and roasted chestnuts. Wren and Pebble were watching Tobin attempt to juggle flaming torches, which Master Oona had specifically forbidden, when Breeze suddenly lifted her head and roared.

Fen grabbed Wren's arm. "Breeze says something unnatural is coming. The wind is wrong."

A moment later, the lanterns began to swing violently. Thick black clouds rolled over the mountains much faster than any normal storm, and in their center glowed a sickly green light.

"That's not weather," said Lord Vex, appearing beside them. "That's a machine."

Out of the clouds burst Captain Gale's sky ship, but it had changed. Iron plates covered its hull, and enormous metal fans spun at its sides, churning the air into a howling wind. Bolts of green lightning crackled from a tall iron mast in the center of the deck.

"She built a storm engine," Vex shouted over the wind. "She's using it to drive the wind dragons out of hiding!"

Lanterns tore loose and spun into the dark. Students screamed and scattered. The hatchery roof, where dozens of dragon eggs rested in warm sand, shuddered and began to crack.

"The eggs!" cried Mira.

Master Oona's voice rang out across the courtyard, calm and clear despite the chaos. "Riders! First-years to the Great Hall. Second-years, protect the hatchery. Wren, Mira, Tobin, Fen: you're with me."

Pebble's earth magic flared as he pressed his claws to the ground. Stone pillars rose up around the hatchery like the fingers of a giant hand, bracing the roof. Ripple sprayed water over the burning lanterns. Blaze, for once, was not allowed to help, since fire was the last thing anyone needed.

But the storm engine kept roaring, and the wind grew stronger and stronger.

"We can't fight that wind," Tobin yelled. "It's too powerful!"

Fen was staring at Breeze. "Maybe we don't have to fight it," she said slowly. "Breeze was born in a storm. She doesn't fight wind. She dances with it."

Before anyone could stop her, Fen climbed onto Breeze's back, and the storm dragon launched herself straight into the hurricane. Instead of pushing against the wind, Breeze spun with it, riding the spiraling air higher and higher, closer and closer to the iron mast.

Wren held her breath. Through the rain, she saw Breeze's tail crackle with her own blue lightning.

"She's going to absorb the green lightning," Master Oona murmured. "Storm dragons can drink lightning. It's incredibly dangerous."

Breeze reached the mast and wrapped her tail around it. Green lightning poured into her body. She glowed brighter and brighter until she looked like a falling star.

Then the storm engine sputtered, coughed, and went silent.

The wind died instantly. The clouds began to tear apart. On the deck of the sky ship, Captain Gale stared at her broken machine, her face twisted with fury.

Breeze dropped out of the sky, exhausted, and Wren's heart stopped. But before Breeze could hit the ground, a huge silver shape swooped beneath her and caught her on its back.

It was Thunder.`,
  qs: [
    ['What was causing the unnatural storm?', ['A storm engine on Captain Gale\'s ship', 'An angry wind dragon', 'A spell from Master Oona', 'The Harvest Lantern Festival'], 0],
    ['Why was Blaze not allowed to help?', ['Fire was the last thing anyone needed in the storm', 'He was too small', 'He was asleep', 'Tobin was juggling'], 0],
    ['What was Fen\'s idea for stopping the storm?', ['Let Breeze ride and dance with the wind instead of fighting it', 'Hide in the Great Hall', 'Ask the pirates to stop', 'Use Pebble\'s stone pillars'], 0],
    ['How did Master Oona act during the chaos?', ['Calm and clear, giving everyone a job', 'Scared and confused', 'Angry at Tobin', 'She ran away'], 0],
    ['Why is Thunder catching Breeze an important moment?', ['It shows Thunder is choosing to help the academy', 'It shows Thunder works for the pirates', 'It shows Breeze is a wind dragon', 'It shows the storm is starting again'], 0]
  ] },
{ title: 'The Lighthouse in the Clouds', emoji: '🔆', series: 'quest', text: `Captain Gale had escaped once again, limping away in her damaged ship. But she had left something behind: a burned scrap of map, caught on a broken lantern hook in the courtyard.

Mira spread it across a table in the library. Most of the map was charred, but one shape was still visible. It was a tall tower drawn in the middle of a cloud, with a circle around it and a single word written beside it: BEACON.

"The Sky Lighthouse," said Master Oona, who had come to look. "I haven't heard that name in forty years. Long ago, a great crystal lamp burned at its top. Its light guided wind dragons safely through storms. When the lamp went dark, the wind dragons scattered."

"Why would Captain Gale want it?" asked Tobin.

Lord Vex answered from the doorway. "Because whoever controls the beacon can call every wind dragon in the north." He looked grim. "If Gale relights it, she won't need nets. The dragons will fly straight to her."

"Then we have to reach it first," Wren said.

The lighthouse stood inside a permanent ring of clouds on the far side of the Floating Islands. Mira calculated the currents. Breeze, who had recovered after three days of sleep, scouted the route. And Thunder, to everyone's astonishment, flew alongside them the entire way, staying close to Vex but never quite close enough to touch.

When they finally pushed through the clouds, the lighthouse rose before them: a slender white tower, cracked and covered in moss, with a dark glass dome at its peak.

Inside, a spiral staircase wound up the walls. Faded paintings of dragons and riders decorated every step. At the very top, they found an enormous crystal sitting in an iron cradle. It was cloudy and gray, like a dead lightbulb.

"How do we light it?" asked Fen.

Wren noticed words carved in an old-fashioned style around the cradle. She read them aloud slowly:

"No flame can wake me, nor lightning, nor sun. I shine for the bond of two hearts made one."

Everyone was silent.

"A bond," Mira said thoughtfully. "Not a rider alone. Not a dragon alone. A rider and dragon who truly trust each other."

Everyone turned to look at Wren and Pebble. Wren stepped toward the crystal, but Pebble gently stopped her.

"Not us," he said through their bond. "Look."

Lord Vex was standing at the window. Outside, Thunder hovered in the air, his huge blue eyes fixed on the man who had once hurt him.

Vex slowly opened the window and held out his hand. He didn't call. He didn't command. He simply waited.

For a long, breathless moment, nothing happened. Then Thunder lowered his great silver head and pressed his forehead against Vex's palm.

The crystal flared to life.

Pure white light burst from the dome and swept across the clouds in a great slow circle. Far away, from every direction, came answering calls: dozens of wind dragons, rising from their hiding places, following the light home.

Vex was laughing and crying at the same time. Thunder rumbled softly, a sound like distant, friendly thunder.

"Now," said Master Oona quietly, "Captain Gale will have to face all of them."`,
  qs: [
    ['What was the purpose of the Sky Lighthouse long ago?', ['Its light guided wind dragons safely through storms', 'It was a prison for pirates', 'It stored dragon eggs', 'It was Master Oona\'s home'], 0],
    ['Why did Captain Gale want the beacon?', ['It could call every wind dragon in the north to her', 'She wanted to live there', 'She needed the crystal to fix her ship', 'She wanted to read the paintings'], 0],
    ['What did the carved words mean?', ['Only a true bond between a rider and dragon could light the crystal', 'The crystal needed fire', 'Lightning would wake the crystal', 'The sun had to shine on it'], 0],
    ['Why did Pebble stop Wren from lighting the crystal?', ['He knew this moment belonged to Vex and Thunder', 'He was scared of the crystal', 'He thought it was a trap', 'He wanted to light it himself'], 0],
    ['What does "astonishment" mean?', ['Great surprise', 'Great anger', 'Great sadness', 'Great boredom'], 0]
  ] },
{ title: 'Flying Together', emoji: '🐉', series: 'quest', text: `The beacon's light changed everything.

Over the next week, wind dragons arrived at Skyfire Academy in twos and threes, gliding down from the north on their feathered wings. Some were young and curious. Others were old and wary, with scars along their wings from pirate nets. Master Oona opened the eastern meadow for them, and the students built shelters from branches and canvas.

Thunder stayed too. He slept on the tower roof above Lord Vex's room, and every morning, the two of them shared breakfast on the balcony.

But Vex still had not ridden him.

"Why not?" Tobin asked one afternoon, as the friends watched Thunder soar gracefully over the meadow. "Thunder obviously likes him now."

"Riding is different," Wren said. "Riding means trusting someone completely. Thunder has to decide when he's ready."

Wren knew how strange it felt to watch someone you cared about wait for something so important. She found herself checking the balcony every morning, hoping.

Then, on a gray Thursday, the academy's warning bell clanged.

A first-year student named Ash had taken his young dragon, Sprig, out for a practice flight without permission. The weather had turned, and now Sprig was trapped on a narrow ledge halfway down the Shattered Cliffs, too frightened to fly in the gusting wind. Ash was clinging to his back.

Wren and Pebble raced to the cliff edge with the others, but one look told them the problem. The cliff curved inward, and wild winds swirled in the gap.

"No dragon can fly in there," Tobin said, his face pale. "The wind would smash them against the rocks."

"No ordinary dragon," Lord Vex said quietly.

He walked to the edge of the cliff and looked up. Thunder was circling above them, his blue eyes fixed on the trapped boy. Vex didn't call his name. He just looked at Thunder, and something passed between them.

Thunder dove.

He landed beside Vex with a gust that nearly knocked Wren over, and lowered one wing to the ground like a ramp. Vex hesitated for only a heartbeat. Then he climbed onto Thunder's back for the first time in more than twenty years.

Together, they plunged over the cliff.

Wren rushed to the edge. Below, Thunder was doing something she had never seen any dragon do: he was flying with the wind instead of against it, folding and unfolding his feathered wings in perfect rhythm with each gust. Vex leaned when Thunder leaned. They moved like one creature.

They reached the ledge. Vex helped Ash and Sprig climb onto Thunder's back. Then Thunder rose up through the swirling winds, carrying all three of them to safety.

When they landed, the whole academy cheered. Ash's parents hugged him and scolded him at the same time. Sprig licked everyone's faces.

Lord Vex slid off Thunder's back, his legs shaking. He rested his hand on Thunder's neck, and the great wind dragon leaned into his touch.

"Thank you," Vex whispered. "For coming back."

Wren felt tears in her eyes. Beside her, Pebble hummed with quiet happiness.

"You know what the best part is?" Pebble said through their bond. "Vex didn't ask Thunder to save the boy. Thunder chose to. And he chose Vex."`,
  qs: [
    ['Why had Vex not ridden Thunder yet?', ['Thunder had to decide when he was ready to trust completely', 'Vex was afraid of heights', 'Master Oona did not allow it', 'Thunder was injured'], 0],
    ['Why couldn\'t ordinary dragons rescue Ash?', ['The wild winds in the curved cliff would smash them against the rocks', 'The cliff was too far away', 'Ash did not want to be rescued', 'It was too dark to see'], 0],
    ['How was Thunder\'s way of flying special?', ['He flew with the wind instead of against it', 'He flew faster than lightning', 'He flew upside down', 'He did not use his wings'], 0],
    ['What does Pebble say is the best part?', ['Thunder chose to help and chose Vex', 'Ash got in trouble', 'The wind stopped', 'Everyone cheered'], 0],
    ['What does "wary" mean, as used to describe some old wind dragons?', ['Careful and not quick to trust', 'Very hungry', 'Extremely fast', 'Sleepy and slow'], 0]
  ] },
{ title: 'The Neighborhood News', emoji: '📰', series: 'club', text: `It was Jules who had the idea for the newspaper.

"Everyone on Maple Street lives right next to each other," Jules said at the club meeting, "but nobody knows what's going on. Did you know Mr. Ortiz grew a tomato the size of a softball? Or that the Kim twins learned to ride bikes? Nobody knows!"

So the Sunny Day Club started The Maple Street Messenger. Priya was the editor, which meant she checked everyone's spelling. Lena drew the pictures. Rosie interviewed neighbors. Jules wrote the headlines, and Daisy, who was now an official member, delivered papers in her red wagon.

The first issue was a huge success. Neighbors stopped the club members on the sidewalk to talk about the articles. Mr. Ortiz framed his tomato story and hung it in his garage.

For the second issue, Rosie wanted something bigger. "We need a mystery," she said. "Something exciting."

That was when she noticed that Mrs. Abernathy's garden gnome had disappeared.

Rosie investigated. She found muddy footprints near the garden. She learned that the Petersons' teenage son, Marcus, had been seen walking down the street late at night carrying something heavy. She wrote an article with the headline GNOME-NAPPED! IS MARCUS PETERSON THE THIEF?

Priya read it and frowned. "Did you ask Marcus about it?"

"No," Rosie admitted. "But the clues all fit."

"Clues that fit aren't the same as facts," Priya said. "If we print this and we're wrong, it could really hurt him."

Rosie was annoyed. She thought Priya was being too careful. But Jules agreed with Priya, and so did Lena. Even Daisy shook her head seriously.

So, reluctantly, Rosie knocked on the Petersons' door.

Marcus answered, looking confused. When Rosie asked about the gnome, his face turned red, and for a terrible moment Rosie thought she was right after all.

Then he said, "Can you keep a secret? Just until Saturday?"

He led her to the garage. There stood Mrs. Abernathy's gnome, but it looked completely different. Marcus had repaired its chipped nose, filled the crack in its hat, and painted it in bright new colors. Its cheeks were rosy, and its little shovel was shining gold.

"She told me last month that the gnome belonged to her husband," Marcus explained quietly. "He passed away last year, and the gnome was falling apart. I wanted to fix it as a surprise for her birthday."

Rosie felt her cheeks burn with shame. She had almost called a kind person a thief in front of the whole street.

On Saturday, Marcus returned the gnome. Mrs. Abernathy cried happy tears and hugged him for a full minute.

The second issue of The Maple Street Messenger had a new headline, written by Rosie herself: THE GNOME MYSTERY: A STORY OF KINDNESS.

Underneath, in a small box, she added an editor's note: Check your facts before you share a story. The truth is usually better than the rumor.`,
  qs: [
    ['Why did Jules want to start a newspaper?', ['Neighbors lived close but did not know what was happening on their street', 'To earn money for toys', 'To become famous', 'Because school required it'], 0],
    ['What mistake did Rosie almost make?', ['Accusing Marcus of stealing without checking the facts', 'Spelling words wrong', 'Losing the gnome', 'Forgetting to deliver papers'], 0],
    ['What does Priya mean by "Clues that fit aren\'t the same as facts"?', ['Something can seem true without being proven true', 'Clues are always wrong', 'Facts are boring', 'Only grown-ups can find facts'], 0],
    ['Why did Marcus take the gnome?', ['To repair it as a birthday surprise for Mrs. Abernathy', 'To keep it for himself', 'To sell it', 'Because it was ugly'], 0],
    ['How did Rosie feel when she learned the truth?', ['Ashamed that she almost hurt a kind person', 'Proud that she solved the case', 'Angry at Priya', 'Bored with the newspaper'], 0]
  ] }
] }
);


DAUGHTER_TRACK.levels.push(
{ n: 11, title: 'Dragon Sage', kind: 'story', stories: [
{ title: 'The Eggs That Would Not Hatch', emoji: '🥚', series: 'quest', text: `Winter arrived at Skyfire Academy with a strange and worrying silence.

Every year, the first snowfall woke the dragon eggs in the hatchery. Wren had seen it herself the year before: dozens of eggs rocking gently in the warm sand, cracking open one by one, while tiny dragons tumbled out sneezing and squeaking. It was the happiest day of the academy year.

This year, the snow fell, and nothing happened.

The eggs lay perfectly still. Day after day, the students checked them, warmed them, sang to them, and read them stories. Ripple misted them with warm water. Blaze breathed gentle heat across the sand. Nothing worked.

Worse, the eggs were growing colder. Their bright colors, which usually shone like jewels, were fading to dull gray.

"I don't understand it," Master Oona admitted one evening. Wren had never heard her sound uncertain before. "The sand is warm. The eggs are healthy. Something is missing, but I don't know what."

Wren couldn't sleep that night. She wandered the dark corridors with Pebble, his scales glowing faintly to light their way. Without quite deciding to, they ended up in the hatchery.

Moonlight streamed through the tall windows. Wren knelt beside the nearest egg, a pale gray one that should have been sapphire blue, and laid her hand on its shell.

"It's so cold," she whispered.

Pebble pressed his nose against the egg and closed his eyes. After a long moment, he spoke through their bond, his voice strange and faraway.

"I can hear it," he said. "Very faintly. The dragon inside is asleep, but it's dreaming. It's dreaming about light."

"Light?" Wren asked. "What kind of light?"

"Starlight," Pebble said. "Not ordinary starlight. A warm, golden kind. It's the light it needs to wake up, and it can't find it."

Wren thought hard. Every winter, the eggs had hatched under the same stars. What had changed?

The next morning, she brought her question to the Hall of Records. Lord Vex listened carefully, then disappeared among the tallest shelves. He returned an hour later carrying a thick book bound in cracked blue leather.

"The Chronicle of the First Riders," he said, blowing dust off the cover. "Almost nobody reads it anymore. It's written in an old style, and it's very long."

Wren didn't care how long it was. She and Mira read it together for three days, sitting cross-legged on the library floor, while Pebble and Ripple dozed beside them.

On the third night, Mira suddenly gasped and pointed to a faded painting. It showed a deep stone well high in the mountains, with golden light pouring upward from it into the night sky.

Beneath it were the words: THE STAR WELL. FROM HERE, THE WARM LIGHT RISES, AND THE EGGS OF THE WORLD AWAKE.

"Where is it?" asked Wren breathlessly.

Mira turned the page. The map beneath the painting showed a long journey across a desert of glass to the highest peak of the Sundered Mountains.

"Far," said Mira. "Very, very far."`,
  qs: [
    ['What usually happens when the first snow falls at the academy?', ['The dragon eggs wake up and hatch', 'The students go home', 'The dragons go to sleep', 'The hatchery closes'], 0],
    ['What clues showed something was wrong with the eggs?', ['They stayed still and grew colder as their colors faded', 'They hatched too early', 'They rolled away', 'They became very heavy'], 0],
    ['What did Pebble learn by listening to the egg?', ['The dragon inside was dreaming of a warm, golden starlight it needed', 'The dragon inside was hungry', 'The egg was empty', 'The egg wanted to be moved'], 0],
    ['Why was it important that Wren and Mira read the old Chronicle?', ['It held the forgotten secret of the Star Well', 'It had pictures of pirates', 'Master Oona asked them to', 'It was the shortest book'], 0],
    ['Why does the author mention that Master Oona sounded uncertain?', ['To show how serious and unusual the problem was', 'To show she was tired', 'To show she was angry', 'To make the story funny'], 0]
  ] },
{ title: 'The Glass Desert', emoji: '🏜️', series: 'quest', text: `Master Oona agreed to let them go, but only if Lord Vex and Thunder went with them. "Two Masters are better than one," she said, "and I must stay here to keep the eggs as warm as I can."

So the crew set off at dawn: Wren and Pebble, Mira and Ripple, Tobin and Blaze, Fen and Breeze, and Lord Vex on Thunder's back, which still made everyone smile.

For two days, they flew south over forests and frozen rivers. On the third day, the ground below them changed completely.

The Glass Desert stretched to the horizon, a vast plain of glittering sand that had melted into smooth, shining sheets long ago. The sun bounced off it so fiercely that Wren had to squint, and the air shimmered with heat.

"It's beautiful," breathed Fen. "And terrible."

"Ancient dragons fought a great battle here," Lord Vex explained. "Their fire was so hot that it turned the sand to glass. Nothing has grown here since."

The heat grew worse with every hour. Even high in the air, the reflected sunlight scorched them. Ripple, the water dragon, began to droop, her scales growing dry and dull. Mira shaded her with a cloak, but it wasn't enough.

"We need to land and rest," Mira said anxiously. "Ripple can't take much more of this."

But there was nowhere to land. The glass below was hot enough to burn a dragon's feet, and there was not a single tree, rock, or shadow for miles.

Tobin, who usually made jokes when things got difficult, was quiet. Then he looked at Blaze, and a strange expression crossed his face.

"Blaze," he said slowly, "you've always been able to make your fire hot. Can you make it cold?"

Everyone stared at him.

"That's ridiculous," said Fen. "Fire isn't cold."

"Old Moss told me once that a fire dragon controls heat," Tobin insisted. "Not just fire. Heat. If he can push heat out, maybe he can pull it in."

Blaze tilted his head. He had never tried such a thing. But he closed his eyes and took an enormous, slow breath, and as he did, the air around the whole crew suddenly cooled, as if a cloud had passed over the sun.

"Blaze," Tobin whispered. "You're doing it!"

Blaze breathed in again and again, pulling the heat from the air around them. Frost began to form along the edges of his scales. He looked surprised and very proud.

Ripple perked up immediately. Mira hugged Tobin so hard he nearly fell off his saddle.

"I've been studying fire dragons for thirty years," Lord Vex said, shaking his head in amazement, "and I've never seen anything like that."

"Nobody ever asked Blaze to try," Tobin said, grinning. "Everybody thinks fire dragons can only do one thing."

Wren thought about that as they flew on through the cool bubble of air Blaze had made. Tobin always acted like the class clown, the one who didn't take anything seriously. But he had understood his dragon in a way nobody else had.

"People are like dragons," Pebble said through their bond, as if reading her thoughts. "Everyone can do more than one thing."

By sunset, the Sundered Mountains rose before them, black and jagged against the orange sky.`,
  qs: [
    ['How was the Glass Desert formed?', ['Ancient dragons\' fire melted the sand into glass', 'A volcano covered it', 'Ice froze the sand', 'Wizards made it with spells'], 0],
    ['Why was the desert especially dangerous for Ripple?', ['She is a water dragon and the heat dried her out', 'She was afraid of glass', 'She could not see', 'She was too heavy'], 0],
    ['What was surprising about Tobin\'s idea?', ['He asked a fire dragon to pull in heat and make the air cold', 'He wanted to turn back', 'He wanted to walk across the glass', 'He wanted to race Thunder'], 0],
    ['How did Wren\'s opinion of Tobin change?', ['She realized the class clown understood his dragon better than anyone', 'She thought he was being silly', 'She decided he was a bad rider', 'She stopped being his friend'], 0],
    ['What does Pebble mean by "Everyone can do more than one thing"?', ['People have more abilities than others expect', 'Everyone should do two chores', 'Dragons can only do one thing', 'Doing many things is tiring'], 0]
  ] },
{ title: 'The Riddle Gate', emoji: '🚪', series: 'quest', text: `The path to the Star Well ended at a gate carved directly into the side of the mountain. It was taller than ten dragons stacked on top of one another, made of dark stone polished as smooth as glass. There was no handle, no keyhole, and no way to push it open.

In the center of the gate, glowing words appeared as the crew approached:

THREE QUESTIONS GUARD THE STAR WELL. ANSWER WITH WISDOM, NOT STRENGTH.

Tobin rolled up his sleeves. "Blaze and I could probably melt it."

"Answer with wisdom, not strength," Mira read again, pointedly.

"Right," said Tobin. "Wisdom. I knew that."

The words shimmered and changed:

THE FIRST QUESTION. I HAVE CITIES BUT NO HOUSES, FORESTS BUT NO TREES, AND RIVERS BUT NO WATER. WHAT AM I?

Everyone thought hard. Breeze grumbled. Thunder flicked his tail.

Then Mira laughed. "A map! It has cities and forests and rivers drawn on it, but they aren't real."

The first line of glowing words faded, and a deep click echoed inside the stone.

THE SECOND QUESTION. WHAT GROWS STRONGER THE MORE YOU GIVE IT AWAY?

This one was harder. They argued for nearly an hour. Fen suggested fire, because you can light many candles from one flame. Tobin suggested laughter. Lord Vex was silent, frowning in concentration.

Wren looked at Pebble. She thought about the day they had first bonded, when Pebble had been a small, frightened dragon who couldn't fly. She thought about all the times she had trusted him, and all the times he had trusted her back, and how their bond had grown stronger each time.

"Trust," Wren said slowly. "The more you give someone your trust, the stronger it grows between you."

The words faded. Another click echoed, louder this time.

Then the final question appeared. This time, the words glowed red.

THE THIRD QUESTION IS FOR ONE OF YOU ALONE. WHO HERE HAS DONE THE GREATEST WRONG, AND WHAT HAVE THEY LEARNED?

The crew went very quiet. Nobody looked at Lord Vex. Everyone knew.

Vex dismounted from Thunder and walked slowly to the gate. He stood before it for a long time, his gray cloak stirring in the cold mountain wind.

"I have," he said quietly. "I treated my dragon like a tool. I wanted power more than friendship. I hurt Thunder, and I hurt myself, and I spent years blaming everyone except the person who was truly responsible."

His voice was steady, though his hands shook.

"What I've learned," he continued, "is that you can't force anyone to trust you. You can only become someone worth trusting, one day at a time, and then wait. And I've learned that it's never too late to begin."

For a long moment, nothing happened.

Then the entire gate glowed gold from top to bottom. With a sound like a deep, slow breath, the enormous stone doors swung inward, revealing a tunnel lit by a soft golden shimmer.

Thunder pressed his head against Vex's shoulder.

Wren felt a lump in her throat. Of all three questions, she realized, the last one had been the hardest to answer, because it required a different kind of bravery.

"Come on," Vex said, wiping his eyes and climbing back onto Thunder. "The Star Well is waiting."`,
  qs: [
    ['What did the gate mean by "Answer with wisdom, not strength"?', ['They had to solve riddles instead of using force', 'They had to be very strong', 'They had to fly over it', 'They had to wait for night'], 0],
    ['What was the answer to the first riddle?', ['A map', 'A forest', 'A river', 'A city'], 0],
    ['How did Wren figure out the second answer?', ['She thought about how her bond with Pebble grew stronger', 'She guessed randomly', 'Mira told her', 'She read it in a book'], 0],
    ['Why was the third question the hardest?', ['It required the bravery to admit a mistake honestly', 'It was the longest riddle', 'Nobody knew the answer', 'It was written in another language'], 0],
    ['What did Vex learn about trust?', ['You must become someone worth trusting and then wait', 'You can force someone to trust you', 'Trust does not matter', 'Only dragons can trust'], 0]
  ] },
{ title: 'Inside the Star Well', emoji: '✨', series: 'quest', text: `The tunnel spiraled upward through the heart of the mountain, its walls glittering with veins of golden crystal. The deeper they went, the warmer the air became, and the softer the light.

At last, they emerged into an enormous round cavern open to the night sky. In its center was a well as wide as a lake, ringed with ancient carved stones. Wren rushed to its edge and looked down.

She had expected to see golden light pouring upward, like the painting in the Chronicle. Instead, the well was dark. Far below, she could make out a faint golden glow, like a candle buried under a heavy blanket.

"Something's blocking it," said Fen.

They flew down carefully, the dragons' wings echoing against the curved walls. Halfway down, they found the problem.

A huge, flat slab of black stone had wedged itself across the well, sealing it like a lid. And sitting on top of the slab, motionless in the gloom, was an enormous figure.

At first, Wren thought it was a statue. It wore a crown of dark iron and a long robe that seemed made of shadows. Its face was a smooth mask with two empty holes for eyes.

Then the eyes began to glow with pale blue light, and the figure slowly stood up.

"Who disturbs the Hollow King?" it said. Its voice echoed like wind through an empty house.

Pebble growled low in his throat. Wren swallowed hard and made herself step forward.

"I'm Wren of Skyfire Academy," she said, her voice shaking only a little. "The dragon eggs in our hatchery can't wake up. They need the light from the Star Well. Please, will you let it shine again?"

The Hollow King tilted its masked head. "Why should I? For a thousand years, riders came to this well. They took its light and flew home. Not one of them ever stayed. Not one of them ever thanked the well, or asked who guarded it, or wondered whether its guardian was lonely."

"So you blocked it," Mira said slowly.

"I sealed it," the Hollow King agreed. "If no one cares for me, why should I care for them?"

Wren looked at the iron crown, the shadow robe, and the empty eyes. She thought she understood. The Hollow King was not exactly evil. It was something else, something sadder. It reminded her of Lord Vex when they had first met, so angry and so alone.

"I'm sorry nobody thanked you," she said. "That wasn't fair."

The Hollow King went very still.

"But blocking the well isn't fair either," Wren continued gently. "Not to the baby dragons. They didn't do anything wrong."

The King's eyes flared bright blue. "Words are easy, child. Many riders have spoken kindly to get what they wanted. Prove that you mean it."

The shadows around its robe began to swirl and rise, filling the well with cold darkness. The dragons roared. Wren felt her heart pounding.

"How?" she asked.

The Hollow King lifted one shadowy hand and pointed at her.

"Face me," it said. "Not with fire or claws. With the truth. If your words are honest, my shadows cannot touch you. If they are hollow, like me, you will be lost in the dark forever."

Wren looked at Pebble. Pebble looked back, steady and warm.

"We'll face you together," she said.`,
  qs: [
    ['What was blocking the Star Well?', ['A slab of black stone with the Hollow King sitting on it', 'A frozen lake', 'A pirate ship', 'A pile of eggs'], 0],
    ['Why did the Hollow King seal the well?', ['For a thousand years no rider ever thanked it or cared that it was lonely', 'It wanted to steal the light', 'Captain Gale paid it', 'It was protecting the riders from danger'], 0],
    ['Why did the Hollow King remind Wren of Lord Vex?', ['Both were angry and alone', 'Both wore crowns', 'Both had wind dragons', 'Both lived in libraries'], 0],
    ['How must Wren prove her words?', ['By facing the Hollow King with the truth', 'By fighting with fire and claws', 'By giving it treasure', 'By leaving the well'], 0],
    ['What does "hollow" mean when the King talks about "hollow" words?', ['Empty, without real meaning', 'Very loud', 'Very old', 'Written in gold'], 0]
  ] },
{ title: 'The Science Fair Secret', emoji: '🔬', series: 'club', text: `Priya had been working on her science fair project for six weeks. It was a solar oven made from a pizza box, aluminum foil, and plastic wrap, and it could melt chocolate and toast marshmallows using nothing but sunlight. She had tested it eleven times and recorded every temperature in a careful chart.

The night before the fair, Priya was so excited she could barely eat dinner.

The next morning, she discovered that her little brother Arjun had accidentally sat on the pizza box. The foil was crumpled. The plastic was torn. The whole oven was flattened like a pancake.

Priya didn't cry. She just sat on her bedroom floor, staring at the ruined box, feeling completely empty.

That was how the Sunny Day Club found her when they arrived to walk to school together.

"Oh no," Rosie said.

"It's fine," Priya said in a flat voice. "I'll just tell Mr. Harmon I don't have a project."

The club members looked at each other. They all knew how hard Priya had worked. They also knew the fair started in exactly one hour and forty minutes.

"We can rebuild it," Jules said.

"We don't have time," Priya said. "And we don't have materials."

"Actually," Lena said slowly, "my mom has foil. And Mr. Ortiz throws away pizza boxes every Friday."

Daisy was already pulling on her coat. "I'll get the box!"

What followed was the fastest, messiest, most frantic hour of the club's history. Rosie raced home for plastic wrap and tape. Lena and Jules smoothed foil with their hands. Daisy returned triumphantly with a slightly greasy pizza box from Mr. Ortiz. And Priya, slowly at first and then faster, began to rebuild.

But something interesting happened as she worked. Because she had to build quickly, she couldn't copy her old design exactly. Instead, she noticed things. The old flap reflected sunlight at the wrong angle. The plastic had always sagged in the middle. This time, she propped the flap with a ruler so it caught more light, and she stretched the plastic tighter with an extra layer of tape.

They arrived at the fair with four minutes to spare, out of breath and covered in tape.

That afternoon, under the bright sun in the school courtyard, Priya's new solar oven melted chocolate in six minutes. Her old oven had taken eleven.

When the judges asked about her project, Priya told them the truth: that her first oven had been destroyed, and that she had rebuilt it in an hour with help from her friends. Then she showed them her chart, with both sets of temperatures side by side.

"So the accident actually made your design better," one judge said, impressed.

"I guess it did," said Priya, surprised.

She didn't win first place. She won second, behind a boy with a robot arm. But when the club walked home together, eating melted-chocolate graham crackers from the solar oven, Priya was smiling.

"You know what the real experiment was?" she said. "Finding out what my friends would do when things went wrong."

"And the result?" Rosie asked.

Priya grinned. "Conclusion: they show up."`,
  qs: [
    ['What happened to Priya\'s solar oven?', ['Her little brother accidentally sat on it', 'It melted in the sun', 'The dog ate it', 'She forgot it at school'], 0],
    ['How did Priya feel when she first saw the ruined oven?', ['Completely empty and ready to give up', 'Angry and loud', 'Excited to start over', 'Not bothered at all'], 0],
    ['Why was the new oven better than the old one?', ['Building quickly made her notice and fix design problems', 'Her friends used better materials', 'The sun was hotter that day', 'The judges helped her'], 0],
    ['What does "frantic" mean?', ['Wild and hurried because of pressure', 'Calm and slow', 'Quiet and sleepy', 'Bored and tired'], 0],
    ['What does Priya mean by "Conclusion: they show up"?', ['Her friends help when things go wrong', 'Her friends always arrive late', 'The judges came to see her', 'Science fairs are easy'], 0]
  ] }
] },
{ n: 12, title: 'Dragon Master', kind: 'story', stories: [
{ title: 'Starlight Returns', emoji: '🌟', series: 'quest', text: `The journey home from the Sundered Mountains took four days, but it felt much shorter, because Wren carried something precious: hope.

The Hollow King had kept his word. After the strange, silent challenge in the well, when Wren and Pebble had stood together in his shadows and spoken only the truth, the shadows had faded away. The black stone slab had crumbled. Golden light had burst upward from the Star Well so brightly that it lit the clouds for miles.

The Hollow King had not vanished. Instead, he had removed his iron crown and set it gently on the edge of the well. Beneath it, his face was no longer an empty mask but an old, tired face with kind gray eyes.

"Come back sometimes," he had said quietly. "Just to talk."

"We will," Wren had promised. "I'll bring stories."

Now, as the crew soared over the last ridge, Skyfire Academy came into view, and Wren gasped.

The golden starlight had arrived before them. It was drifting down over the academy like snow made of light, settling softly on every rooftop and tower. Students were running into the courtyard, holding out their hands, laughing as the glowing flakes landed on their palms.

"The hatchery!" Mira shouted.

They landed in a rush and raced inside. The hatchery was glowing. Every egg had regained its color: sapphire blue, emerald green, ruby red, and dozens of shades Wren had no names for. They were rocking gently in the warm sand.

Then, with a tiny crack, the first egg split open.

A small purple dragon tumbled out, blinked at the light, and sneezed a puff of glittering smoke. The whole room cheered.

Crack. Crack. Crack. One after another, the eggs opened. Baby dragons squeaked and stumbled and climbed over one another. Master Oona stood in the middle of it all, laughing and crying at the same time, a newborn dragon perched on her head like a hat.

When she saw Wren, she made her way across the room and hugged her tightly.

"You did it," she whispered. "All of you."

That evening, the academy held a celebration in the Great Hall. Lord Vex told the story of the Glass Desert and the Riddle Gate, and everyone cheered for Tobin and Blaze's cold fire. Mira showed her map of the wind currents. Fen and Breeze performed a dance of lightning in the sky above the hall.

But in the middle of the feast, something strange happened.

The candles flickered. The windows darkened. Wren looked outside and frowned.

It was evening, so the sky should have been turning from orange to purple. Instead, it was turning black, as if someone had pulled a curtain across the setting sun. The stars disappeared one by one.

Master Oona hurried to the window, and her face went pale.

"An eclipse," she whispered. "But there shouldn't be an eclipse for another hundred years."

High above the academy, in the darkness where the sun should have been, two enormous violet eyes opened and looked down.`,
  qs: [
    ['How had the Hollow King changed?', ['He took off his crown, showed his kind face, and asked them to visit', 'He became more angry', 'He disappeared forever', 'He followed them home'], 0],
    ['What did Wren promise the Hollow King?', ['To come back and bring stories', 'To give him treasure', 'To let him rule the academy', 'To never return'], 0],
    ['How did the starlight help the eggs?', ['It gave them the warm light they needed to wake and hatch', 'It made them invisible', 'It made them colder', 'It turned them into stone'], 0],
    ['Why was Master Oona surprised by the eclipse?', ['There should not be one for another hundred years', 'She had never seen the sun', 'She thought it was a party trick', 'It was too early in the morning'], 0],
    ['What mood does the last sentence create?', ['Suspense and danger', 'Calm and peace', 'Silliness', 'Sadness about the past'], 0]
  ] },
{ title: 'The Night That Did Not End', emoji: '🌑', series: 'quest', text: `The darkness lasted all night, and when morning came, it did not end.

The sun never rose. The sky stayed black, without a single star. A cold, unnatural wind swept across the mountains, and frost crept over every window of Skyfire Academy. The baby dragons, so newly hatched, huddled together in the hatchery, shivering.

High in the sky, where the sun should have been, a vast shape lay curled around a dim circle of light. It was a dragon, so enormous that its body seemed to cover half the sky. Its scales were the deep violet of twilight, and its two great eyes glowed like dying stars.

"Umbra," said Master Oona quietly, as the riders gathered in the cold courtyard. "The Twilight Queen."

"I thought she was just a legend," said Tobin.

"Most people do," Master Oona replied. "A thousand years ago, Umbra was the guardian of the night. Every evening, she spread her wings across the sky so the world could rest. Every morning, she folded them so the sun could shine. People sang songs to her and told stories about her. She was loved."

"What happened?" asked Wren.

Master Oona sighed. "People forgot. Over hundreds of years, they stopped singing her songs and telling her stories. They began to believe night just happened by itself. And Umbra fell asleep in the deep places of the sky, alone and forgotten."

"So why is she awake now?" asked Fen.

Lord Vex answered. "The Star Well. When its light burst out, it must have reached her and woken her up." He looked up at the enormous dragon. "And now she's angry."

As if she had heard him, Umbra spoke. Her voice was not loud, but it filled the whole sky, cold and sorrowful.

"I guarded your nights for a thousand years. I gave you darkness to rest and stars to dream by. And you forgot me. You forgot my name. You forgot my songs. So now I will keep the night forever, and you will know what it means to lose something you never valued."

The courtyard was silent. Wren felt Pebble trembling beside her.

"She's not exactly wrong," Mira whispered.

"No," Wren said slowly. "She's not."

It was the same story again, Wren realized. Lord Vex, the Hollow King, and now Umbra. Each of them had been hurt by being treated as unimportant, as if they didn't matter. And each of them had grown angry and lonely and cold.

But Vex had changed. The Hollow King had changed. Maybe Umbra could change too.

That night, Wren went to the library with a candle. She searched every shelf until she found what she was looking for: the oldest book in the academy, so ancient that its pages were made of thin, golden bark. Inside were songs, hundreds of them, written in a strange, beautiful language that almost nobody could read anymore.

At the very bottom of the last page, in tiny letters, was a title: THE LULLABY OF UMBRA.

Wren couldn't read the words. But Lord Vex could.

"I studied the old language for ten years," he said quietly, when she showed him. "I never knew why I kept practicing. Maybe it was for this."`,
  qs: [
    ['Who is Umbra?', ['The ancient guardian of the night', 'A pirate captain', 'A baby dragon', 'Master Oona\'s dragon'], 0],
    ['Why was Umbra angry?', ['People forgot her name, her songs, and her stories', 'Someone stole her treasure', 'The academy was too loud', 'She wanted to be the sun'], 0],
    ['What pattern did Wren notice?', ['Vex, the Hollow King, and Umbra were all hurt by being treated as unimportant', 'All the villains wore crowns', 'All the villains were dragons', 'All the problems happened in winter'], 0],
    ['Why was it important that Vex studied the old language?', ['He could read the forgotten lullaby to Umbra', 'He wanted to impress Master Oona', 'He needed it to fly Thunder', 'He used it to talk to pirates'], 0],
    ['What does "sorrowful" mean?', ['Full of sadness', 'Full of joy', 'Full of anger', 'Full of energy'], 0]
  ] },
{ title: 'All the Riders Together', emoji: '🤝', series: 'quest', text: `To reach Umbra, someone would have to fly higher than any rider had ever flown, through freezing winds and darkness so thick it swallowed light.

"It's impossible," said a fourth-year student at the emergency meeting in the Great Hall. "No dragon can fly that high in this cold. Their wings would freeze."

The hall murmured in agreement. Wren felt her hope sinking.

Then Tobin stood up. "Blaze can pull heat out of the air," he said. "What if he pushes it in instead? He could keep a bubble of warm air around everyone, the way he kept us cool in the desert."

"And Breeze can feel the wind currents in the dark," Fen added, standing beside him. "She can find the smoothest path, even where nobody can see."

"I mapped the high currents in the north," Mira said, rising too. "If we follow them, we'll save our strength."

"Thunder has flown higher than any dragon alive," said Lord Vex. "He can carry the lullaby to Umbra's ear."

One by one, more students stood up. Ash and his little dragon Sprig offered to carry lanterns, even though Sprig could barely fly yet. The wind dragons from the eastern meadow, the ones they had rescued from the pirates, stepped forward and spread their silver wings. Even old Grandmother Willa arrived from the Floating Islands with baskets of warm barley bread.

Wren looked around the hall at all the faces. A year ago, none of this would have been possible. Tobin had been the class clown. Mira had been too shy to speak. Vex had been an enemy, and Thunder had been gone. Now they were all standing together.

"We won't fight Umbra," Wren said, her voice ringing through the hall. "We'll fly up there together, all of us, and we'll give her back what she lost. Her song."

They launched at midnight.

It was the strangest, most beautiful flight of Wren's life. Dozens of dragons rose into the black sky in a great spiral, their lanterns glowing like a river of stars. Blaze flew at the center, wrapping them all in warmth. Breeze led the way, her lightning flickering softly to show the path. Mira called out the currents. The wind dragons formed a shield around the youngest riders.

Higher and higher they climbed. The air grew so thin that Wren could barely breathe. Frost formed on Pebble's horns. Her fingers went numb on the saddle.

"Keep going," Pebble said through their bond, though she could feel how tired he was. "We're almost there. I can feel her."

Then, suddenly, they broke through the darkness and found themselves face to face with Umbra.

She was even larger up close. Each of her violet eyes was as big as the academy's Great Hall. When she breathed, the cold rolled over them like an avalanche.

"Why have you come?" she asked, and her voice made the air tremble. "To fight me? You cannot win."

"We didn't come to fight," Wren called out, her voice tiny against the vastness of the sky. "We came to say we're sorry. And to remember you."

Lord Vex guided Thunder forward until they were close to Umbra's enormous head. He unrolled the golden bark page with trembling hands.

Then, in the old and beautiful language that no one had spoken in a thousand years, he began to sing.`,
  qs: [
    ['Why did people think reaching Umbra was impossible?', ['No dragon could fly that high in the cold without freezing', 'Umbra lived underground', 'Umbra was too far away to see', 'The pirates guarded the sky'], 0],
    ['How did each rider contribute to the plan?', ['Each offered their own special skill', 'Everyone did the same job', 'Only Wren helped', 'They let Master Oona decide everything'], 0],
    ['How had the characters changed over the year?', ['The shy, the silly, and even enemies became a united team', 'They became more selfish', 'They stopped being friends', 'They forgot about dragons'], 0],
    ['Why did they choose not to fight Umbra?', ['They wanted to give back what she lost, her song', 'They were too tired', 'They did not have weapons', 'Umbra asked them not to'], 0],
    ['What does "vastness" mean?', ['Great size that seems endless', 'Great noise', 'Great speed', 'Great darkness'], 0]
  ] },
{ title: 'Wren\'s Choice', emoji: '💜', series: 'quest', text: `Lord Vex's voice rose into the frozen sky. It was not a perfect voice. It cracked on the high notes and shook with cold. But the old words were beautiful, and as he sang them, something began to happen.

Umbra's great violet eyes softened. The icy wind around her slowed.

Vex sang about a dragon who spread her wings each night so that tired people could sleep. He sang about the stars she hung like lanterns, and the silver moon she carried on her back, and the gentle darkness she wrapped around the world like a blanket. Wren couldn't understand the words, but she could feel their meaning, warm and sad and full of love.

When the song ended, there was a long silence.

Then Umbra closed her eyes, and a single tear slid down her enormous cheek. It fell past the riders, glittering like a falling star.

"I had forgotten," she whispered, "that anyone ever loved me."

"We're sorry," Wren said. "We didn't know. But now we do, and we won't forget again."

Umbra opened her eyes and looked at Wren for a long time. "Words are easy," she said, just as the Hollow King had. "In a hundred years, your people will forget me again."

Wren knew this was the most important moment of her life. She felt Pebble steady beneath her, warm and solid as a mountain.

"Then I'll make sure they don't," she said. "I'll write down your story, every word of it. I'll teach your song at Skyfire Academy, so every rider learns it on their first day. And every year, on the longest night of winter, we'll hold a festival in your honor. We'll sing to you, and light lanterns for you, and tell your story, so that no one will ever forget the guardian of the night again."

The other riders called out in agreement. Mira promised to paint Umbra's picture in the Great Hall. Tobin promised to make the festival the best party the academy had ever seen. Even the youngest students, shivering in their saddles, shouted that they would remember.

Umbra looked at all of them, at the river of lanterns stretching far below, at the tiny, brave riders who had flown higher than anyone ever had just to say they were sorry.

"Very well," she said softly. "I will trust you."

Slowly, gracefully, she began to unfold her enormous wings.

As she moved, the dim circle of light behind her grew brighter. A golden rim appeared, then a sliver of blazing sun, then more and more, until warm morning light poured across the sky. The darkness melted away. The frost on the academy's windows turned to sparkling drops of water.

Far below, Wren heard cheering, faint but joyful.

Umbra settled into a long, graceful glide above them. "When evening comes," she said, "I will spread my wings once more, as I always have. But this time, I will be listening for your songs."

The riders flew home through the golden morning, exhausted and freezing and happier than they had ever been.

As they landed in the courtyard, Wren slid off Pebble's back and threw her arms around his neck.

"We did it," she whispered.

"No," Pebble said, his voice warm in her mind. "You did something harder than winning a fight. You made a promise. Now you have to keep it."

Wren smiled. "I know," she said. "That's the best part."`,
  qs: [
    ['How did Umbra react to the song?', ['Her eyes softened and she cried because she remembered being loved', 'She laughed at it', 'She became angrier', 'She fell asleep immediately'], 0],
    ['Why did Umbra doubt Wren at first?', ['She thought people would forget her again', 'She did not understand Wren\'s language', 'She thought Wren was a pirate', 'She was too tired to listen'], 0],
    ['What promises did Wren make?', ['To write Umbra\'s story, teach her song, and hold a festival every year', 'To give Umbra gold', 'To leave the academy', 'To fight Umbra next year'], 0],
    ['What does Pebble say is harder than winning a fight?', ['Making a promise and keeping it', 'Flying very high', 'Singing a song', 'Waking up early'], 0],
    ['What is the main theme of this story?', ['Remembering and honoring others can heal hurt', 'Strength always wins', 'Night is scary', 'Dragons should not be trusted'], 0]
  ] },
{ title: 'The Last Day of Summer', emoji: '🌻', series: 'club', text: `On the last day of summer, the Sunny Day Club held its final meeting of the season in the tree house on Maple Street.

It had been an amazing year. They had found lost pets, fixed a garden gnome, held a bake sale, started a newspaper, rescued a science fair project, and helped half the neighbors on the street. Their club notebook was stuffed so full that Priya had needed to start a second one.

But today, nobody was celebrating. Today, they were saying goodbye.

Jules's family was moving to another city, four hours away. Jules had told them three weeks ago, and they had all been pretending it wasn't really happening. Now the moving truck was parked outside Jules's house, and pretending didn't work anymore.

They sat in a circle on the tree house floor, not saying much. Daisy leaned her head on Rosie's shoulder. Lena drew small, sad doodles in the margin of the notebook.

"It won't be the same," Rosie said finally. "The Sunny Day Club was always five of us. Well, four, and then five when Daisy joined."

"I know," Jules said quietly. "I keep thinking that if I leave, the club will just stop."

Priya had been unusually quiet. Now she opened the very first notebook to the very first page. In her careful handwriting was the club's original rule, written two years ago: WE HELP PEOPLE ON OUR STREET.

"Jules," she said slowly, "is there a street where you're moving?"

Jules blinked. "Well, yes. Obviously."

"And are there people on it?"

"Probably," said Jules. "Why?"

Priya smiled for the first time all morning. "Then the Sunny Day Club isn't stopping. It's starting a new chapter."

Everyone looked at her.

"Jules can start the Sunny Day Club, Second Street Branch," Priya explained, her voice growing excited. "Or whatever the street is called. Jules can help neighbors there, and we'll keep helping here. And we can write to each other every week about what we're doing. Like a newspaper between two clubs."

Lena sat up straight. "I could design a logo for both clubs!"

"We could video call during meetings," Rosie added.

"I could send you sprinkles," said Daisy seriously, which made everyone laugh.

Jules was smiling now, though their eyes were wet. "A Sunny Day Club in two places at once," they said. "That's even better than one."

Before the moving truck left, the club gave Jules a gift: a brand-new notebook. On the first page, they had all signed their names, and underneath, in Priya's careful handwriting, they had copied the original rule: WE HELP PEOPLE ON OUR STREET.

Below that, Rosie had added a second rule, written in big, bold letters: FRIENDS STAY FRIENDS, NO MATTER HOW FAR.

As the truck pulled away, Jules leaned out of the window and waved until they turned the corner.

That night, Priya opened the club notebook and wrote a heading on a fresh page: CHAPTER TWO.

Then she smiled, closed the notebook, and turned out the light.`,
  qs: [
    ['Why was the last meeting of summer sad?', ['Jules was moving to another city', 'The tree house was falling down', 'The club was ending forever', 'Daisy was sick'], 0],
    ['What was the club\'s original rule?', ['We help people on our street', 'We meet every day', 'Only four members allowed', 'No little sisters'], 0],
    ['How did Priya use the original rule to solve the problem?', ['She realized Jules could help people on a new street and start a new branch', 'She changed the rule', 'She asked Jules not to move', 'She closed the club'], 0],
    ['What does "starting a new chapter" mean in this story?', ['Beginning a new part of their story, not ending it', 'Writing a new book', 'Reading a different chapter', 'Moving to a new house'], 0],
    ['What does Rosie\'s new rule teach?', ['Friendship can continue even across distance', 'Friends should never move', 'Clubs should stay small', 'Notebooks are important'], 0]
  ] }
] }
);

/* Academy Tales for ranks 9–12: standalone side adventures (her "Short Stories" card) */
Object.assign(DAUGHTER_EXTRA, {
  9: [
    { title: 'The Dragon Who Collected Spoons', emoji: '🥄', series: 'quest', text: `For one whole week, spoons kept disappearing from the Skyfire Academy dining hall.

At first, it was only a few. Then it was dozens. By Friday, the cooks were serving soup with forks, and everyone was grumpy.

"Someone is stealing spoons," Tobin announced at breakfast, trying to eat porridge with a butter knife. "This is the greatest mystery of our time."

Wren rolled her eyes, but she was curious too. That night, she and Pebble hid behind a curtain in the dining hall and waited.

Just after midnight, the window creaked open. A young wind dragon, no bigger than a large dog, squeezed through. It had fluffy silver feathers and enormous, curious eyes. It hopped onto a table, grabbed a spoon in its beak, and admired its reflection with obvious delight.

"It's a baby," Pebble whispered. "One of the young wind dragons from the meadow."

The little dragon gathered six more spoons and slipped back out the window. Wren and Pebble followed it across the moonlit grounds to the old bell tower. There, tucked behind the bell, was a nest made entirely of spoons, hundreds of them, glittering in the moonlight like a pile of treasure.

"Oh," said Wren softly. "It's not stealing. It's building a home."

She remembered something from her lessons: young wind dragons decorate their first nests with shiny objects to feel safe. In the wild, they used ice crystals or polished stones. This little dragon had simply found the shiniest things it could.

The next morning, Wren explained everything to the head cook, a large, stern woman named Mrs. Bramble. Wren expected her to be furious.

Instead, Mrs. Bramble's face softened. "Poor little thing," she said. "Far from its family, trying to make a home." She thought for a moment. "We'll need our spoons back. But I have a box of old, dented ones in the storeroom. They're too battered to use, but they still shine."

So that afternoon, Wren, Tobin, and Mrs. Bramble carried the dented spoons to the bell tower and carefully traded them, one by one, for the good ones. The little wind dragon watched suspiciously at first. Then it realized it was getting even more spoons than before, and it chirped with joy.

By dinner, the dining hall had all its spoons back.

And from then on, every time a spoon got bent, Mrs. Bramble set it aside in a special basket labeled FOR THE SPOON DRAGON.`,
      qs: [['What was disappearing from the dining hall?', ['Spoons', 'Forks', 'Bowls', 'Bread'], 0], ['Why was the young wind dragon taking spoons?', ['It was decorating its first nest to feel safe', 'It was hungry', 'It wanted to annoy the cooks', 'It was playing a game'], 0], ['How did Wren\'s understanding of the "thief" change?', ['She realized it was not stealing but building a home', 'She decided it was a villain', 'She thought Tobin did it', 'She thought the cooks lost them'], 0], ['How did Mrs. Bramble react, surprisingly?', ['She felt sympathy and offered old spoons', 'She was furious', 'She chased the dragon away', 'She closed the dining hall'], 0], ['What does "battered" mean?', ['Damaged and dented from use', 'Brand new', 'Very shiny', 'Made of gold'], 0]] },
    { title: 'Tobin\'s Terrible Poem', emoji: '📜', series: 'quest', text: `Mira's birthday was in three days, and Tobin had a problem.

"I want to give her something special," he told Wren, pacing back and forth in the stables while Blaze watched him with amused eyes. "Something meaningful. Not just candy."

"What about a poem?" Wren suggested. "Mira loves poetry."

Tobin's eyes lit up. "A poem! Perfect! How hard can it be?"

It turned out to be very hard.

Tobin's first poem began: "Mira, Mira, you are very nice, your dragon Ripple is made of ice." Wren gently pointed out that Ripple was a water dragon, not an ice dragon. Tobin crumpled the page.

His second poem rhymed "birthday" with "Thursday," even though Mira's birthday was on a Saturday. His third poem was eleven pages long and was mostly about Blaze.

By the night before the party, Tobin had filled an entire wastebasket with crumpled pages, and he was miserable.

"I'm just not good with words," he groaned. "I'm good at jokes and flying. That's all."

Wren sat down beside him. "Tobin, forget about rhyming. What do you actually like about Mira?"

Tobin thought about it. "She notices things nobody else notices. She remembers everything. She was the one who figured out the wind currents when the rest of us were stuck. And she's always the first one to check if you're okay when you fall."

Wren smiled. "Write that."

"But it doesn't rhyme," Tobin protested.

"It doesn't need to," said Wren. "It needs to be true."

The next day, at Mira's party, Tobin stood up nervously and unfolded a single sheet of paper. His hands were shaking a little.

"Mira," he read, "you notice what nobody else notices. You remember what everyone else forgets. When the rest of us were lost in the sky, you were the one who found the way. And when any of us falls down, you're always the first one there to help us up. Happy birthday to the best navigator at Skyfire."

The room was quiet. Then Mira burst into tears, the happy kind, and hugged him so hard that he nearly fell over.

"That's the best present anyone has ever given me," she said.

Later, Tobin found Wren by the punch bowl. "It didn't rhyme even once," he said, amazed.

"I know," said Wren. "That's why it was perfect."`,
      qs: [['What was Tobin\'s problem at the start?', ['He wanted to give Mira a meaningful birthday present', 'He forgot Mira\'s birthday', 'He lost his dragon', 'He was sick'], 0], ['Why did Tobin\'s first poems fail?', ['He focused on rhyming instead of saying what was true', 'He wrote in another language', 'He never finished one', 'Blaze ate them'], 0], ['What advice did Wren give?', ['Write what you actually like about Mira, even if it doesn\'t rhyme', 'Buy candy instead', 'Ask Mira what she wants', 'Copy a famous poem'], 0], ['How did Mira react to the poem?', ['She cried happy tears and hugged him', 'She laughed at him', 'She did not listen', 'She was confused'], 0], ['What does this story teach?', ['Honest words matter more than fancy ones', 'Poems must always rhyme', 'Gifts should be expensive', 'Never write poems for friends'], 0]] }
  ],
  10: [
    { title: 'The Night the Hatchlings Escaped', emoji: '🐣', series: 'quest', text: `Every first-year at Skyfire Academy had to take a turn as Hatchery Watcher, and on a rainy Wednesday night, it was Wren's turn.

"It's easy," Master Oona had said. "The baby dragons sleep all night. Just make sure the fire stays warm and the door stays closed."

For the first two hours, it was easy. Six tiny hatchlings slept in a heap in their straw nest, snoring in little puffs of smoke. Wren read a book by the fire while Pebble dozed beside her.

Then a gust of wind blew the door open with a bang.

Six pairs of eyes snapped open. Six tiny dragons tumbled out of the nest. And before Wren could even stand up, all six of them had scampered out the door and into the dark, rainy night.

"Oh no," Wren whispered. "Oh no, no, no."

She grabbed a lantern and ran after them, with Pebble close behind.

The hatchlings had scattered in six different directions. Wren found the first one in the kitchen, sitting inside a pot of cold soup. She found the second one in the music room, where it had climbed inside a tuba and was blowing smoke out of the end. The third was in the laundry, tangled in a bedsheet like a tiny ghost.

"Three more," panted Pebble. "Where would baby dragons go on a cold night?"

Wren stopped and thought. Baby dragons loved warmth more than anything. Where was the warmest place in the academy at night?

"The bakery ovens!" she said.

Sure enough, the last three hatchlings were curled up together on top of the big brick oven, where the bread was rising for the morning. They were covered in flour and looked extremely pleased with themselves.

By the time Wren had carried all six back to the hatchery, cleaned off the soup, the flour, and the tuba smoke, and tucked them into their nest, the sun was rising.

Master Oona appeared in the doorway, looking at the muddy floor, the soggy lantern, and Wren's flour-covered clothes.

"Long night?" she asked.

Wren sighed and told her everything. She expected to be in trouble.

Instead, Master Oona laughed. "In my first year, I lost eleven hatchlings," she said. "It took me until lunchtime to find the last one. It was in the headmaster's bathtub."

Wren laughed too, so hard that the hatchlings woke up and blinked at her.

"Next time," Master Oona added, "lock the door."`,
      qs: [['What was Wren\'s job for the night?', ['Hatchery Watcher', 'Kitchen helper', 'Night guard at the gate', 'Library keeper'], 0], ['What caused the hatchlings to escape?', ['A gust of wind blew the door open', 'Wren let them out', 'Pebble scared them', 'Tobin played a trick'], 0], ['How did Wren figure out where the last three hatchlings were?', ['She remembered that baby dragons love warmth', 'She heard them crying', 'Pebble smelled them', 'Master Oona told her'], 0], ['Why did Master Oona laugh instead of being angry?', ['She had made an even bigger mistake when she was young', 'She did not care about the hatchlings', 'She thought Wren was joking', 'She was too tired'], 0], ['What does "scampered" mean?', ['Ran quickly with small steps', 'Slept deeply', 'Flew high', 'Walked slowly'], 0]] },
    { title: 'Master Oona\'s Secret', emoji: '🗝️', series: 'quest', text: `Everyone at Skyfire Academy knew that Master Oona was the greatest dragon rider in the kingdom. She had flown through hurricanes, crossed the Frozen Sea, and once raced a lightning bolt and won. Her dragon, an enormous golden creature named Sol, was so old and wise that even the other Masters bowed to him.

So when Wren discovered Master Oona's secret, she could hardly believe it.

It happened by accident. Wren had gone to the Hall of Records to return a book, and she found Lord Vex organizing a dusty box of old student reports. One of them had fallen open on the floor. Wren picked it up and saw the name at the top: OONA, FIRST YEAR.

At the bottom of the page, in faded red ink, a teacher had written: Student refuses to fly above the tree line. Severe fear of heights. Recommend she consider leaving the academy.

Wren stared at the words. Master Oona? Afraid of heights?

"I shouldn't have read this," she said guiltily, handing it to Lord Vex.

"Probably not," Vex agreed. "But perhaps you should ask her about it."

Wren worried about it for two days. Finally, after an evening lesson, she gathered her courage and stayed behind.

"Master Oona," she said nervously, "I accidentally saw your first-year report."

Master Oona raised her eyebrows. For a moment, Wren was sure she was in trouble. Then the old teacher smiled.

"Ah," she said. "So now you know."

"Is it true? Were you really afraid of heights?"

"Terribly," said Master Oona. "For my entire first year, I couldn't fly higher than the treetops without shaking so badly I almost fell off. Everyone said I should give up."

"What changed?" Wren asked.

Master Oona was quiet for a moment. "Sol did," she said. "One day, when I was too frightened to go higher, he said to me: 'You don't have to go all the way up today. Just one wingbeat higher than yesterday.' So that's what I did. One wingbeat higher every day. It took me two years to reach the clouds."

She looked out the window, where Sol was sleeping in the sunlight.

"I'm still a little afraid of heights, you know," she added quietly. "I just learned that being afraid and being brave can happen at the same time."

Wren thought about all the things she was afraid of. Then she smiled.

"One wingbeat higher," she repeated.

"One wingbeat higher," said Master Oona.`,
      qs: [['What did Wren discover about Master Oona?', ['She was once terribly afraid of heights', 'She was a pirate', 'She could not read', 'She did not like dragons'], 0], ['What did the teacher recommend in Oona\'s first-year report?', ['That she consider leaving the academy', 'That she become a teacher', 'That she get a bigger dragon', 'That she study more'], 0], ['What advice did Sol give Oona?', ['Go just one wingbeat higher than yesterday', 'Never look down', 'Close your eyes and fly fast', 'Give up and try something else'], 0], ['What does Master Oona mean when she says being afraid and brave can happen at the same time?', ['You can feel fear and still do the hard thing', 'Brave people are never afraid', 'Fear means you should stop', 'Only dragons are brave'], 0], ['Why did Lord Vex suggest Wren talk to Master Oona?', ['He thought the conversation might help Wren', 'He wanted Wren to get in trouble', 'He did not want the report', 'He wanted to leave'], 0]] }
  ],
  11: [
    { title: 'Ripple and the Frozen Fountain', emoji: '⛲', series: 'quest', text: `In the middle of the academy's winter garden stood the Fountain of Riders, a tall stone sculpture of a dragon and rider spraying water into a wide pool. It had flowed every day for two hundred years, even in the coldest winters.

Until one morning, it froze solid.

The water hung in the air in frozen ribbons. The pool was a sheet of white ice. And trapped beneath the ice, swimming in slow, frightened circles, were the academy's twelve golden koi fish.

"They'll run out of air," Mira said in alarm. "We have to break the ice."

Tobin raised his hand. "Blaze could melt it!"

"No!" said Mira and Wren together. Blaze's fire was so hot that it would boil the water and cook the fish instantly.

Pebble tried to crack the ice with his earth magic, but the pool's stone sides were connected to the fountain, and he was afraid of breaking the ancient sculpture.

Everyone turned to Ripple. Ripple, the water dragon, was looking at the frozen fountain with a very strange expression.

"Ripple says the water is sad," Mira translated slowly. "She says it froze because something is blocking it, deep down in the pipes."

Ripple dove into a small hole at the base of the fountain, where the pipes ran underground. For a long time, nothing happened. The friends waited anxiously, watching the koi swim slower and slower beneath the ice.

Then there was a deep gurgle. A rumble. A loud pop.

Warm water burst up from the fountain's top, spraying high into the air. It poured down over the frozen pool, and within moments, the ice began to crack and melt. The koi darted joyfully through the clearing water.

Ripple emerged from the pipe, dripping and proud, holding something in her mouth. It was a wad of old leaves, twigs, and a single, very soggy mitten.

"Somebody's mitten blocked the pipe," Mira said, laughing. "The water couldn't flow, so it froze."

Tobin stared at the mitten. Then his face turned red. "That's mine," he admitted. "I lost it last week during the snowball fight."

Everyone laughed, including Tobin.

That evening, Mira wrote in her notebook about the day. Underneath, she added a thought: Sometimes the biggest problems come from the smallest things. And sometimes the best way to solve a problem isn't to fight it from the top, but to find where it starts.`,
      qs: [['Why were the koi fish in danger?', ['They were trapped under the ice and could run out of air', 'They were too hot', 'Someone was trying to catch them', 'They were too hungry'], 0], ['Why couldn\'t Blaze melt the ice?', ['His fire would boil the water and hurt the fish', 'He was asleep', 'He was too small', 'He was afraid of ice'], 0], ['What did Ripple understand that the others didn\'t?', ['Something was blocking the water deep in the pipes', 'The fish wanted to stay frozen', 'The fountain was broken forever', 'Pebble should break the ice'], 0], ['What was causing the problem?', ['A wad of leaves, twigs, and Tobin\'s mitten in the pipe', 'A spell from the Hollow King', 'A crack in the pool', 'Too much snow'], 0], ['What does Mira mean by finding "where it starts"?', ['Solving the cause of a problem instead of just its effects', 'Starting every day early', 'Reading from the beginning', 'Finding the fountain\'s builder'], 0]] },
    { title: 'The Map That Was Wrong', emoji: '🗺️', series: 'quest', text: `Ever since her wind current map had saved the day at the Floating Islands, Mira had become famous at Skyfire Academy. Students asked her for flying routes. Teachers asked her to explain currents in class. Even the fourth-years, who usually ignored the younger students, nodded at her respectfully in the hallways.

Mira loved it. But secretly, it also made her nervous.

"What if I make a mistake?" she confided to Wren one evening. "Everyone thinks my maps are perfect now."

"Everyone makes mistakes," Wren said.

"Not me," Mira said. "Not anymore. I can't."

A week later, the fourth-years planned a long training flight to the Eagle Crags, using a new route Mira had mapped. She had worked on it for days. But on the morning of the flight, as she was checking her notes one last time, her stomach dropped.

She had made an error. A big one. She had copied one of her measurements backward, and her map showed a calm current where there was actually a dangerous downdraft that could pull dragons toward the rocks.

The fourth-years were already saddling up in the courtyard.

Mira froze. If she told everyone, they would know her map was wrong. Everyone would see that she wasn't perfect after all. Maybe they would never trust her maps again.

But if she said nothing, someone could get hurt.

Wren found her standing in the hallway, pale and shaking. When Mira explained, Wren didn't tell her what to do. She just asked one question.

"What would you want someone else to do, if they found a mistake in their map?"

Mira closed her eyes. Then she ran.

She burst into the courtyard just as the first dragons were lifting off. "Stop!" she shouted. "Please, stop! My map is wrong!"

Every head turned toward her. Mira's face burned, but she kept going. She explained the error, pointed out the downdraft, and drew the correct route in the dirt with a stick.

The courtyard was silent. Then the leader of the fourth-years, a tall girl named Sabine, walked over and studied the drawing.

"You caught this yourself?" Sabine asked. "Before we left?"

Mira nodded, waiting for her to be angry.

Instead, Sabine smiled. "Then I trust your maps even more now," she said. "Anyone can make a mistake. A good navigator is someone who checks, and who tells the truth when she finds one."

That night, Mira wrote a new rule on the first page of her map notebook: Being trustworthy is more important than being perfect.`,
      qs: [['Why was Mira secretly nervous about being famous?', ['She was afraid people would stop trusting her if she made a mistake', 'She did not like attention', 'She wanted to quit flying', 'She thought her maps were boring'], 0], ['What mistake did Mira find?', ['She had copied a measurement backward and missed a dangerous downdraft', 'She drew the wrong mountain', 'She forgot the map at home', 'She spelled a word wrong'], 0], ['What question did Wren ask to help Mira decide?', ['What would you want someone else to do if they found a mistake?', 'Do you want to be famous?', 'Should we hide the map?', 'Are you sure it is wrong?'], 0], ['How did Sabine react?', ['She trusted Mira\'s maps even more for catching the mistake', 'She was furious', 'She laughed at Mira', 'She refused to fly ever again'], 0], ['What new rule did Mira write?', ['Being trustworthy is more important than being perfect', 'Never make maps again', 'Always fly alone', 'Fourth-years are always right'], 0]] }
  ],
  12: [
    { title: 'Captain Gale\'s First Lesson', emoji: '🧭', series: 'quest', text: `Nobody at Skyfire Academy expected Captain Gale to actually show up.

But on the first day of spring, she walked through the academy gates, without her coat of stolen dragon scales and without her sky ship. She carried only a small bag and wore a plain gray cloak. She looked much less frightening this way. She looked almost nervous.

"Lord Vex said I could learn," she told Master Oona stiffly. "If the offer still stands."

Master Oona studied her for a long time. "It stands," she said finally. "But you'll start where everyone starts. With the first-years."

So Captain Gale, the most feared pirate in the northern skies, found herself sitting in a tiny wooden chair at the back of the beginner classroom, surrounded by eight-year-olds learning how to brush a dragon's scales.

The first-years were terrified of her at first. They whispered and stared. One boy hid under his desk. But Gale ignored them and focused on her lessons, frowning in concentration as she practiced the gentle brushing strokes on a sleepy old dragon named Barnaby.

She was terrible at it. She brushed too hard, and Barnaby grumbled. She tried to command him to lift his wing, and he simply rolled over and went back to sleep.

"Dragons don't take orders," explained the first-year teacher patiently. "You have to ask."

"Ask?" Gale repeated, as if the word were in a foreign language.

Wren watched from the doorway with Lord Vex. "Do you think she'll stay?" she whispered.

"I didn't think I would," said Vex. "But I did."

Day after day, Gale returned to the beginner classroom. Slowly, the first-years stopped being afraid. A little girl named Pip began sitting next to her and correcting her brushing technique. "Softer," Pip would say. "Like you're petting a kitten."

One afternoon, about a month later, Wren was passing the stables when she stopped in amazement.

Captain Gale was sitting in the straw beside Barnaby, brushing his scales with long, gentle strokes. The old dragon's eyes were half-closed with happiness. And when Gale whispered, "Could you lift your wing, please?" Barnaby lifted it right away and rested it gently across her shoulders like a blanket.

Gale's face changed completely. For the first time since Wren had known her, she smiled, not a cold, sharp smile, but a real one.

"He listened," she said, astonished. "I asked, and he listened."

"That's how it works," said Wren softly.

Gale looked up at her. "I spent twenty years trying to force dragons to obey me," she said. "I never once tried asking." She shook her head slowly. "What a waste."

"It's not a waste if you learned something," Wren said.

Gale was quiet for a long moment. Then she nodded, and went back to brushing Barnaby's scales, very gently, one stroke at a time.`,
      qs: [['How was Captain Gale different when she arrived?', ['She wore a plain cloak and looked nervous instead of frightening', 'She brought her pirate crew', 'She was riding Thunder', 'She was angry and loud'], 0], ['Why did Gale start with the first-years?', ['Master Oona said she must start where everyone starts', 'She was the youngest', 'She asked to teach them', 'She failed a test'], 0], ['What was the most important thing Gale had to learn?', ['Dragons don\'t take orders; you have to ask', 'How to fly faster', 'How to build machines', 'How to read maps'], 0], ['How did Pip help Gale?', ['She showed her how to brush gently, like petting a kitten', 'She hid under her desk', 'She told her to leave', 'She gave her a dragon'], 0], ['What does Wren mean by "It\'s not a waste if you learned something"?', ['Past mistakes can still lead to growth', 'Gale wasted her whole life', 'Learning is always a waste', 'Gale should go back to being a pirate'], 0]] },
    { title: 'The Smallest Rider', emoji: '🌱', series: 'quest', text: `Ash was the smallest student at Skyfire Academy, and his dragon, Sprig, was the smallest dragon. Sprig was a green leaf dragon, no bigger than a house cat, with tiny wings that fluttered like a hummingbird's.

Ever since the day Lord Vex and Thunder had rescued them from the Shattered Cliffs, Ash had been afraid to fly. He came to every flying lesson, but he always found an excuse to stay on the ground. Sprig had a cold. His saddle was loose. It looked like rain.

Wren noticed, because she remembered feeling exactly the same way.

One afternoon, she found Ash sitting alone by the pond, watching the older students soar overhead.

"Mind if I sit?" she asked.

Ash shrugged. Sprig crawled into his lap.

"When I was a first-year," Wren said, "Pebble couldn't fly at all. His wings were too small. Everyone laughed at us. I used to sit right here and watch everybody else, wishing I could hide forever."

Ash looked up, surprised. "But you're Wren. You helped save the whole sky."

"I wasn't always," said Wren. "I had to start somewhere. Everybody does."

Ash was quiet for a while. "I keep thinking about the cliffs," he finally said. "About falling. What if it happens again?"

Wren nodded seriously. "It might. Flying always has some danger. But you know what Master Oona told me? You don't have to go all the way up today. Just one wingbeat higher than yesterday."

Ash looked at Sprig. Sprig looked back at him with bright, hopeful eyes.

"One wingbeat?" Ash said.

"One wingbeat," said Wren.

Ash climbed carefully onto Sprig's back. The little dragon's wings buzzed. Slowly, wobbling, they rose until Ash's feet were exactly one wingbeat off the grass. Then they landed.

Ash was grinning. "That was so small," he said, laughing. "That barely counts."

"It counts," said Wren.

The next day, Ash flew two wingbeats high. The day after that, he flew to the top of the garden wall. By the end of the month, he and Sprig were zipping around the courtyard so fast that the older students had to duck.

On the last day of spring, Ash found Wren in the courtyard. He was holding the hand of a tiny, nervous girl who had just arrived at the academy. Her dragon egg hadn't even hatched yet.

"This is Lila," Ash said. "She's scared of heights."

He winked at Wren. Then he knelt beside Lila and said, very seriously, "You don't have to go all the way up today. Just one wingbeat higher than yesterday."

Wren smiled so widely that her cheeks hurt. Somewhere far above, she was sure, Master Oona's dragon Sol was smiling too.`,
      qs: [['Why was Ash afraid to fly?', ['He remembered almost falling at the Shattered Cliffs', 'Sprig was too big', 'He did not like his saddle', 'Wren told him not to'], 0], ['Why did Wren understand Ash\'s feelings?', ['She had felt the same way when Pebble could not fly', 'She was afraid of ponds', 'She had never been afraid', 'Lord Vex told her'], 0], ['What advice did Wren pass on to Ash?', ['Just one wingbeat higher than yesterday', 'Fly as high as you can right away', 'Never look down', 'Stay on the ground'], 0], ['How did Ash improve?', ['Little by little, a bit higher every day', 'All at once in one big flight', 'By getting a bigger dragon', 'By watching others fly'], 0], ['What is meaningful about the ending?', ['Ash passes the same advice to someone new, continuing the chain of kindness', 'Ash quits the academy', 'Lila gets a bigger dragon than Ash', 'Wren becomes afraid again'], 0]] }
  ]
});
for (const n of [9, 10, 11, 12]) DAUGHTER_TRACK.levels[n - 1].stories.push(...DAUGHTER_EXTRA[n]);

/* ---- "Think deeper" questions for Biscuit & Pals (levels 4–12): lesson, author's message, what the story implies.
   Answer is always index 0 (choices are shuffled when shown). ---- */
const SON_DEEP = {
  'Biscuit and the Big Hat': [['What does this story show about Biscuit and Zip?', ['They have fun together', 'They are angry at each other', 'They do not know each other'], 0], ['Why do you think the author made the hat BIG and RED?', ['So it is easy to picture and funny', 'Because hats must be red', 'So Biscuit can hide in it'], 0]],
  'Plip Gets Wet': [['Biscuit got wet but "did not mind." What does that tell you about Biscuit?', ['He is easygoing and can have fun', 'He is very mad', 'He hates water'], 0], ['What is the lesson of this story?', ['Little accidents can still be fun', 'Never sit on a log', 'Frogs are mean'], 0]],
  'Toasty the Fire Pup': [['Why does the author say "hot, hot, hot"?', ['To show the tail is VERY hot', 'Because the author forgot', 'To show the tail is cold'], 0], ['How is Toasty a good friend?', ['He uses his hot tail to keep friends warm', 'He takes their tent', 'He runs away'], 0]],
  'The Big Nap': [['Biscuit is the last one up. What does that tell you?', ['He was very cozy and sleepy', 'He was the fastest', 'He did not nap at all'], 0], ['What is this story mostly about?', ['Friends resting together on a sunny day', 'A big race', 'A lost hat'], 0]],
  'Where Is the Cap?': [['How did Biscuit know the red tip was his cap?', ['His cap is red, so he used the color as a clue', 'Zip told him', 'He heard it'], 0], ['What does the author want you to learn?', ['Look carefully, step by step, to find things', 'Never take a nap', 'Caps are always under rugs'], 0], ['Zip sat on the cap during her nap. Did she mean to hide it?', ['No, it was an accident', 'Yes, she wanted to trick Biscuit', 'Yes, she wanted a hat'], 0]],
  'The Missing Snack': [['Why were the steps WET?', ['The snack-taker came from the pond', 'It was raining inside', 'Biscuit spilled water'], 0], ['What does the story teach about clues?', ['Clues like wet steps can show where someone went', 'Clues are always words', 'Clues do not help'], 0]],
  'Embit Is Cold': [['Why does Embit\'s flame get small?', ['The rain makes the fire weak', 'Embit is sleepy', 'Max blew on it'], 0], ['What is the lesson of this story?', ['Friends take care of each other when things are hard', 'Rain is bad', 'Foxes like coats'], 0], ['Embit licks Max on the nose. What does that show?', ['Embit is thankful and loves Max', 'Embit is hungry', 'Embit is still cold'], 0]],
  'Max Meets Sparko': [['Why did Max sit down instead of running at Sparko?', ['So shy Sparko would not be scared', 'Because he was tired', 'Because he did not like Sparko'], 0], ['What does the author believe about making new friends?', ['Be patient and gentle and friends will come close', 'Chase them until you catch them', 'Shy friends are not worth it'], 0]],
  'Zip Is Fast': [['Biscuit lost but said "Let\'s race again!" What does that tell you?', ['He cares more about fun than winning', 'He is sad and wants to quit', 'He thinks he won'], 0], ['What is the moral of this story?', ['Having fun is more important than winning', 'Always be the fastest', 'Never race a bunny'], 0]],
  'The Lost Ball': [['What does this story show about Leafy?', ['She is a helpful friend', 'She is selfish', 'She is scared of balls'], 0], ['Why did Biscuit say "Thank you, Leafy!"?', ['To show he was grateful for her help', 'Because Leafy took the ball', 'Because he was mad'], 0]],
  'Rainy Day': [['How does Biscuit change from the start to the end?', ['He goes from sad to having fun', 'He goes from happy to sad', 'He does not change'], 0], ['What did Plip help Biscuit learn?', ['Something you don\'t like can be fun if you try it', 'Rain is always sad', 'Stay inside forever'], 0]],
  'Toasty\'s Snack': [['What does it mean that they "both laugh" at the black toast?', ['They did not get upset about a mistake', 'They thought the toast tasted good', 'They were angry'], 0], ['What is the lesson?', ['When you make a mistake, laugh and try again', 'Never make toast', 'Fire pups are bad cooks'], 0]],
  'The Case of the Loud Bump': [['Why did Biscuit think of Toasty when he felt the warm pot?', ['Toasty is a fire pup, and fire makes things warm', 'Toasty likes pots', 'Toasty was in the kitchen'], 0], ['Why was Toasty NOT the one?', ['He was in bed, snoring', 'He was too small', 'He does not like snacks'], 0], ['What does this story show about good detectives?', ['They check if a guess is right before deciding', 'They blame the first friend they think of', 'They never go out at night'], 0]],
  'Who Ate the Flowers?': [['Zip\'s face turned pink. What does that tell you?', ['She felt embarrassed because she did it', 'She was hot', 'She ate pink flowers'], 0], ['What did Zip do to make things right?', ['She helped plant new flowers', 'She hid', 'She ate more flowers'], 0], ['What is the moral of this story?', ['When you make a mistake, say sorry and help fix it', 'Never grow flowers', 'Bunnies are bad'], 0]],
  'The Doke-Race': [['Why did slow Leafo win?', ['Leafo kept going and did not stop', 'Leafo was the fastest', 'Sparko let Leafo win'], 0], ['What is the moral of this story?', ['Slow and steady can win the race', 'Fast always wins', 'Never run in a race'], 0], ['What does Sparko\'s high five show?', ['Sparko is a good sport', 'Sparko is angry', 'Sparko won'], 0]],
  'Splashy Finds a Home': [['Why were the mud pit and bird bath NOT good homes?', ['One was too dirty and one was too small', 'They were too far', 'They had too many fish'], 0], ['What does this story say about Max?', ['He helps a friend solve a big problem', 'He wants Splashy to leave', 'He does not like water'], 0]],
  'The Shell at the Beach': [['Why did they put the shell back?', ['So a crab could have a home', 'Because it was broken', 'Because it was too hot'], 0], ['What does the author want you to think about?', ['Be kind to nature and animals', 'Take every shell home', 'Crabs are scary'], 0]],
  'Chip the Chick': [['Zip and Toasty could not help. How did Biscuit help?', ['He made a plan and used his hat', 'He jumped very high', 'He called a bird'], 0], ['What is the lesson?', ['When something is hard, think of a plan', 'Give up when it is hard', 'Chicks should not climb'], 0]],
  'The Big Storm': [['Why was Zip not scared?', ['She is a lightning pal, so storms don\'t scare her', 'She was asleep', 'She was hiding'], 0], ['What does the rainbow at the end make you feel?', ['That good things come after hard times', 'That the storm will come back', 'That rainbows are scary'], 0]],
  'Brush, Brush, Brush': [['Why did singing a song help Toasty?', ['It made brushing fun', 'It made his teeth white by magic', 'It made him sleepy'], 0], ['What is the author teaching you?', ['Making a chore fun helps you do it', 'Never brush your teeth', 'Songs are for bedtime only'], 0]],
  'The Case of the Shiny Coin': [['Why did Biscuit say "Plip has no feathers"?', ['To rule out friends who could not leave a feather', 'Because Plip is sad', 'Because Plip took the coin'], 0], ['Biscuit traded the crow a bottle cap instead of just taking the coin. What does that show?', ['He was fair and kind, even to the crow', 'He wanted the bottle cap gone', 'He was scared of the crow'], 0], ['What does the author believe about solving problems?', ['Use clues and be fair to everyone', 'Blame the first one you see', 'Crows are bad'], 0]],
  'Two Snowman Mysteries': [['Why did Biscuit look at the sky first?', ['To see if the sun could melt the snowman', 'To look for birds', 'Because he was bored'], 0], ['What does "Two mysteries, two answers" mean?', ['Each problem can have its own cause', 'One answer fixes everything', 'Mysteries come in pairs'], 0], ['Was anyone being mean to the snowman?', ['No, the sun and a hungry deer did it', 'Yes, Zip broke it', 'Yes, Toasty stole the nose'], 0]],
  'Flutterbit Can Not Sleep': [['How did Max fix TWO problems?', ['A leaf tent for the light and a song for the noise', 'He turned off the moon', 'He sent the owl away forever'], 0], ['What is the lesson?', ['Find out what is wrong, then fix each part', 'Just tell friends to go to sleep', 'Owls are bad'], 0]],
  'Rumble Is Lost': [['Why did bits of rock fall on the path?', ['Rumble\'s back is rocky and bits fall when he climbs', 'It was raining rocks', 'Embit dropped them'], 0], ['Max says "Next time, let\'s come together." What is he hinting?', ['He wants Rumble to tell him before going off alone', 'He is mad at Rumble', 'He does not like the hill'], 0]],
  'The Case of the Silent Bell': [['Biscuit did not want to hurt the spider. What does this show?', ['He is kind, even to tiny creatures', 'He is scared of spiders', 'He wants a pet spider'], 0], ['What does the author believe?', ['You can solve a problem AND be kind', 'Spiders should be squished', 'Bells are better than bugs'], 0]],
  'The Case of the Backward Footprints': [['Why did the tail line in FRONT of the prints matter?', ['It showed someone walked backward', 'It showed a snake was there', 'It showed the prints were old'], 0], ['What does "the tail tells the tale" mean?', ['The tail mark tells what really happened', 'Tails can talk', 'Toasty told a story'], 0], ['What does this story teach about clues?', ['Look closely, because things are not always how they seem', 'The first idea is always right', 'Mud is boring'], 0]],
  'The Case of the Missing Present': [['Why did the friends move the present?', ['For a surprise party', 'To steal it', 'Because it was broken'], 0], ['Biscuit says "the clue was an accident." What does he mean?', ['The glitter fell off by mistake, but it still led him there', 'Someone left glitter to trick him', 'He spilled the glitter'], 0], ['What does this story show about Biscuit\'s friends?', ['They love him and planned something special', 'They wanted to make him sad', 'They forgot his birthday'], 0]],
  'The Big Storm Rescue': [['Why did Max say "We need a plan"?', ['Rushing in could be dangerous', 'He was bored', 'He wanted to wait for the storm to end'], 0], ['What does "Nobody could have done it alone" mean?', ['Each pal\'s skill was needed', 'Max did it by himself', 'The kitten saved itself'], 0], ['What is the moral of this story?', ['Teamwork can do what one person can\'t', 'Storms are fun', 'Kittens should stay on sheds'], 0]],
  'The Dokemon Club Show': [['Why did Leafo think it had no tricks?', ['It compared itself to faster, flashier friends', 'It did not want to be in the show', 'It was sick'], 0], ['What did Max help Leafo see?', ['Being slow and patient is a strength too', 'Leafo should practice running', 'Leafo should skip the show'], 0], ['What does the author believe?', ['Everyone has a special gift, even if it is different', 'Only fast tricks are good', 'Slow is bad'], 0]],
  'The Case of the Midnight Music': [['"Detectives believe in clues." What does Biscuit mean?', ['Look for real facts instead of scary guesses', 'Ghosts are real', 'Clues are spooky'], 0], ['Why did fact three (no wind, no music) matter most?', ['It proved the wind was causing the sound', 'It proved ghosts were real', 'It proved Plip was singing'], 0], ['How did the friends turn a scary thing into a good thing?', ['They made a real bottle band', 'They broke the bottles', 'They stayed inside'], 0]],
  'The Case of the Lucky Rock': [['What does "retracing your steps" mean?', ['Going back the way you went to find something', 'Walking backward', 'Running very fast'], 0], ['Why was the sand on Toasty\'s paws a clue?', ['It showed he went somewhere he forgot: the sandbox', 'It showed he went to the beach', 'It showed it was windy'], 0], ['What does Biscuit mean by "Clues are everywhere, if you look"?', ['Small things around you can solve a mystery', 'Clues are hidden in rocks', 'Only detectives can find clues'], 0]],
  'The Case of the Painted Fence': [['Why did Biscuit say the squirrel "wasn\'t trying to ruin anything"?', ['It stepped in paint by accident', 'It wanted to help paint', 'It was mad at Leafy'], 0], ['How did Leafy turn a bad thing into a good thing?', ['She turned the prints into flowers', 'She painted over everything', 'She chased the squirrel away'], 0], ['What is the lesson?', ['Don\'t stay mad at accidents; make something good from them', 'Never paint fences', 'Squirrels are mean'], 0]],
  'The Missing Doke-Pod': [['Why did Max make a list of where he went?', ['To figure out where he could have left it', 'To show his mom', 'To practice writing'], 0], ['What lesson did Max write down?', ['Always check your pockets', 'Never take a bath', 'Washing machines are bad'], 0]],
  'Footprints in the Park': [['Why would a squirrel dig up tulip bulbs?', ['Bulbs look like nuts, so it thought they were food', 'It hated tulips', 'It wanted to plant them'], 0], ['Why did they put a net over the flower bed?', ['To stop the problem from happening again', 'To catch the squirrel', 'To keep the sun out'], 0]],
  'Who Took the Blue Ribbon?': [['Why did Nora say a blue bush was "tricky"?', ['Something blue would blend in and be hard to see', 'The bush was a trick', 'Blue bushes are poisonous'], 0], ['The goat won "funniest pet." What does that show about Mr. Pike?', ['He has a good sense of humor about mistakes', 'He was angry at the goat', 'He did not like the other pets'], 0]],
  'The Squeaky Door': [['Why did Max pull his blanket higher "anyway"?', ['He felt a little scared even though he didn\'t believe in ghosts', 'He was cold', 'He wanted to sleep'], 0], ['Max says "You could just ask for a snack." What lesson is he teaching?', ['It is better to ask than to sneak', 'Never eat crackers', 'Ghosts are hungry'], 0], ['Why does Max call them "clue traps," not mean traps?', ['They catch information, not hurt anyone', 'They catch ghosts', 'They are for mice'], 0]],
  'The Lunchbox Switch': [['What is surprising about who mixed up the lunches?', ['Max and Theo did it themselves as the helpers', 'Ms. Bell did it on purpose', 'A Dokemon did it'], 0], ['What does Max believe good detectives do?', ['Stop problems from happening again', 'Only find who to blame', 'Never solve their own mistakes'], 0]],
  'The Aquarium Mystery': [['Why did Goldie hide?', ['The tapping on the glass scared her', 'She was hungry', 'Someone stole her'], 0], ['What does the author want readers to learn?', ['Be gentle and quiet around animals', 'Fish like loud noises', 'Always tap the glass'], 0], ['Why did Max check the lid first?', ['To see if anyone could have taken her out', 'To feed Goldie', 'To clean the tank'], 0]],
  'The Vanishing Snowman': [['Why did Max think a thief did NOT take Mr. Frost?', ['All the parts were left; only the snow was gone', 'He saw the thief', 'Snowmen can\'t be stolen'], 0], ['Was Embit being bad?', ['No, he was cold and did not know he was melting it', 'Yes, he hates snowmen', 'Yes, he wanted the carrot'], 0], ['What is the lesson?', ['Look for the real reason before you blame someone', 'Never build snowmen', 'Fire Dokemon are naughty'], 0]],
  'Midnight Music': [['Why was the raccoon playing the piano?', ['It was chasing a moth that landed on the keys', 'It wanted to make music', 'Mrs. Lopez trained it'], 0], ['Why did Max look at the open window?', ['An animal could climb in from the tree', 'He wanted fresh air', 'It was raining'], 0]],
  'The Lost Library Book': [['Who "took" the book?', ['Mr. Chen, by accident, to hold up a pot', 'Mrs. Webb', 'A story time kid'], 0], ['What does this story show about grown-ups?', ['Grown-ups make mistakes and forget things too', 'Grown-ups are never wrong', 'Librarians hide books'], 0]],
  'The Birthday Cake Mystery': [['What does "evidence" mean?', ['The clues that prove what happened', 'A kind of cake', 'A guess'], 0], ['Why did Nora stop being angry?', ['Leo was little and just wanted a taste', 'The cake was fine', 'She did not like cake'], 0], ['What is the moral?', ['Be kind and forgiving to people who make small mistakes', 'Never have a party', 'Little brothers are bad'], 0]],
  'The Zoo Train Mystery': [['Why did the peanut shell NOT matter?', ['It was Captain Rosa\'s lunch, not a clue', 'Peanuts are always clues', 'The crow ate peanuts'], 0], ['Why did Captain Rosa leave the crow a bottle cap?', ['So it would not need to take her key', 'To trick the crow', 'Because she had too many'], 0], ['What does the author believe about problems?', ['Solve them in a way that is fair to everyone', 'Punish whoever did it', 'Ignore them'], 0]],
  'The Lighthouse Light': [['Why did Max ask if the light was "reflecting something"?', ['With no electricity, the light must come from somewhere else', 'He liked mirrors', 'He thought it was a ghost'], 0], ['Why did the town put up a sign instead of fixing the window?', ['To protect the owl\'s home', 'They were lazy', 'They wanted more ghosts'], 0], ['What does this story say about scary stories like "haunted" places?', ['There is usually a real reason if you look', 'They are always true', 'You should never go near them'], 0]],
  'The Stolen Trophy': [['What does "investigate" mean?', ['To look carefully for facts', 'To take something', 'To fix a trophy'], 0], ['Max said the trophy was "borrowed to make it better." What is the big idea?', ['Something that looks bad may have a good reason', 'All trophies get stolen', 'Art teachers take things'], 0], ['Why did Ms. Kim paint a magnifying glass on the trophy?', ['To thank Max for being a great detective', 'By mistake', 'Because it looked like a bolt'], 0]],
  'The Map in the Bottle': [['Why did Max think a little kid made the map?', ['The paper was new and the letters were wobbly', 'It said "kid" on it', 'It was in a bottle'], 0], ['Why did Clara make the treasure map?', ['She was new and wanted a friend', 'She wanted to trick people', 'She lost her treasure'], 0], ['What does the author believe about friendship?', ['Being friendly to someone new is a real treasure', 'Treasure is better than friends', 'Strangers are scary'], 0]],
  'The Fake Gold Coin': [['How did Max know the coin was fake?', ['The dragon\'s tail curled the wrong way', 'It was too big', 'Sparko said so out loud'], 0], ['What does "The biggest mysteries are often solved by the smallest clues" mean?', ['Noticing tiny details can solve big problems', 'Small mysteries are easy', 'Clues must be big'], 0], ['Why did Max trust Sparko\'s feelings?', ['Sparko can sense metal that people can\'t', 'Sparko is always right about everything', 'Sparko was scared'], 0]],
  'Night at the Museum': [['Why did Embit bury the toe bone?', ['He wanted to discover a dinosaur bone of his own', 'He wanted to eat it', 'He was hiding it from Max'], 0], ['What does "Curiosity is good. Asking first is better." mean?', ['Wanting to learn is great, but ask before you touch', 'Never be curious', 'Always dig things up'], 0], ['Why did Mr. Ford give Embit a real fossil?', ['To reward his curiosity in a good way', 'Because Embit stole it', 'To get rid of it'], 0]],
  'The Missing Mascot': [['Why did Max stop the kids from blaming the Raccoons?', ['There was no evidence, and blaming without proof isn\'t fair', 'He liked the Raccoons better', 'He already knew Ava did it'], 0], ['What does "Telling the truth takes courage" mean?', ['It can be scary to tell the truth, so doing it is brave', 'Truth is easy', 'Only brave kids make mistakes'], 0], ['Why did Theo share his popcorn at the end?', ['He was sorry for blaming their school', 'He did not like popcorn', 'The Raccoons won'], 0]],
  'The Silent Bell': [['Why did June tie the nest in place?', ['She felt sad for the bird and wanted to help', 'She wanted the bell to stop', 'She was playing a trick'], 0], ['What does "The best solutions help everyone" mean?', ['Find a fix that is good for the bird AND the town', 'Only the town matters', 'Only the bird matters'], 0]],
  'The Rainbow Paint Mystery': [['Why did Max think it was NOT vandals?', ['Every splash was low, like an animal made it', 'Vandals are always tall', 'Pickles told him'], 0], ['What changed the town\'s feelings from angry to happy?', ['Learning the truth, then making art from the mess', 'The paint washed away', 'Mr. Pike yelled'], 0], ['What is the lesson?', ['Don\'t jump to blame; find the truth first', 'Dogs should never go outside', 'Art Walks are bad'], 0]],
  'The Detective\'s Hardest Case': [['Why did the town plan a mystery for Max?', ['To thank him for helping everyone', 'To trick him', 'Because they were bored'], 0], ['What is "the most important clue of all"?', ['A detective is never really solving mysteries alone', 'Riddles are hard', 'Gold notebooks are best'], 0], ['What does the author believe about helping others?', ['When you help people, they remember and care about you', 'Helping is a waste of time', 'Only detectives help'], 0]]
};
