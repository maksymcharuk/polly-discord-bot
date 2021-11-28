// Require the necessary discord.js classes
const { Client, Intents } = require('discord.js');
const { token } = require('./config.json');
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  entersState,
  StreamType,
  AudioPlayerStatus,
  VoiceConnectionStatus,
} = require('@discordjs/voice');
const axios = require('axios').default;
const admin = require('firebase-admin');
const serviceAccount = require('./firebase.json');
const schedule = require('node-schedule');
const { createDiscordJSAdapter } = require('./adapter');

// Create a new client instance
const client = new Client({
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_VOICE_STATES,
  ],
});
const greeting = ['Здарова', 'Привет', 'Здарова мужички', 'Greetings', 'Бім бім, бам бам', 'Кто? Я? Нет!', 'Опачки']

const player = createAudioPlayer();

const gayCheck = schedule.scheduleJob('*/2 * * * *', function(){
  gayAnnouncement();
});

gayCheck.schedule();

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

function addParticipant(participant) {
  console.log(participant);
  let participantData = {
    id: participant.id,
    username: participant.username,
    counter: 0
  }
  return db.collection('gay-game').doc(`${new Date().getTime()}`).set(participantData).then(() => {
    console.log('new participant added')
  });
}

async function gayAnnouncement() {
  let targetGuild = client.guilds.cache.get('914188466198294610')
  let randomChannel = targetGuild.channels.cache.filter(ch => ch.type === 'GUILD_VOICE').random();
  let participants = [];
  db.collection('gay-game').get()
    .then(doc => {
      participants = doc.docs.map(doc => doc.data());
      docs = doc.docs;
      
      (async ()=>{
        try {
          const gayOfTheDay = participants[Math.floor(Math.random()*participants.length)];
          const gayOfTheDayData = docs.find(doc => doc.data().id === gayOfTheDay.id);
          const greetingOfTheDay = greeting[Math.floor(Math.random()*greeting.length)];

          const audioFileUrl = (
            await axios.get(
              `http://ec2-16-170-224-19.eu-north-1.compute.amazonaws.com:3000/speak`,
              { params: { text: `${greetingOfTheDay}, ${gayOfTheDay.username} пидор` } }
            )
          ).data;
          const connection = await connectToChannel(randomChannel);
          connection.subscribe(player);
          playSong(audioFileUrl)

          db.collection("gay-game").doc(gayOfTheDayData.id).update({counter: ++gayOfTheDay.counter})
          .then(function() {
            console.log("gay updated");
          });

          setTimeout(() => {
            connection.destroy();
          }, 8000);
        } catch (error) {
          console.error(error);
        }
      })();
    })
    .catch(err => {
      console.log('Error blyat', err);
      process.exit();
    })
}

function playSong(url) {
  const resource = createAudioResource(url, {
    inputType: StreamType.Arbitrary,
  });

  player.play(resource);

  return entersState(player, AudioPlayerStatus.Playing, 5e3);
}

async function connectToChannel(channel) {
  const connection = joinVoiceChannel({
    channelId: channel.id,
    guildId: channel.guild.id,
    adapterCreator: createDiscordJSAdapter(channel),
  });

  try {
    await entersState(connection, VoiceConnectionStatus.Ready, 30e3);
    return connection;
  } catch (error) {
    connection.destroy();
    throw error;
  }
}

// When the client is ready, run this code (only once)
client.once('ready', () => {
  console.log('Ready!');
  gayAnnouncement();
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;

  const { commandName } = interaction;

  if (commandName === 'ping') {
    await interaction.reply('Pong!');
  } else if (commandName === 'server') {
    await interaction.reply('Server info.');
  } else if (commandName === 'user') {
    await interaction.reply('User info.');
  }
});

const prefix = '!'; // just an example, change to whatever you want

client.on('messageCreate', async (message) => {
  if (!message.content.startsWith(prefix)) return;

  const args = message.content.trim().split(/:+/g);
  const cmd = args[0].slice(prefix.length).toLowerCase();

  if (cmd === 'iamgay') {
    addParticipant(message.member.user);
  }
});

client.on('messageCreate', async (message) => {
  if (!message.content.startsWith(prefix)) return;

  const args = message.content.trim().split(/:+/g);
  const cmd = args[0].slice(prefix.length).toLowerCase(); // case INsensitive, without prefix

  if (cmd === 'speak') {
    if (args[2]) return message.reply('Too many arguments.');
    message.reply(args[1]);

    const channel = message.member?.voice.channel;

    if (channel) {
      try {
        const connection = await connectToChannel(channel);
        connection.subscribe(player);
        const audioFileUrl = (
          await axios.get(
            `http://ec2-16-170-224-19.eu-north-1.compute.amazonaws.com:3000/speak`,
            { params: { text: args[1] } }
          )
        ).data;
        playSong(audioFileUrl);
        message.reply('Playing now!');
      } catch (error) {
        console.error(error);
      }
    } else {
      message.reply('Join a voice channel then try again!');
    }
  }
});

// Login to Discord with your client's token
client.login(token);
