// Require the necessary discord.js classes
require('dotenv').config();
const {
  Client,
  Intents,
  MessageEmbed
} = require('discord.js');
const Discord = require('discord.js');
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
const serviceAccount = {
  type: process.env.type,
  project_id: process.env.project_id,
  private_key_id: process.env.private_key_id,
  private_key: process.env.private_key.replace(/\\n/g, '\n'),
  client_email: process.env.client_email,
  client_id: process.env.client_id,
  auth_uri: process.env.auth_uri,
  token_uri: process.env.token_uri,
  auth_provider_x509_cert_url: process.env.auth_provider_x509_cert_url,
  client_x509_cert_url: process.env.client_x509_cert_url
}
const schedule = require('node-schedule');
const {
  createDiscordJSAdapter
} = require('./adapter');
const CronJob = require('cron').CronJob;

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

const gayCheck = new CronJob('00 00 18 * * *', function () {
  const d = new Date();
  console.log('Time:', d);
  gayAnnouncement();
});

gayCheck.start();

// const gayCheck = schedule.scheduleJob('* * * * *', function(){ 
//   gayAnnouncement();
// });

// gayCheck.schedule();

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

function addParticipant(participant, message) {
  db.collection('gay-game').get()
    .then(doc => {
      participants = doc.docs.map(doc => doc.data());
      if (!!participants.find(user => user.id === participant.id)) {
        message.reply(`${participant.username} you already registered gay4ik`)
      } else {
        let participantData = {
          id: participant.id,
          username: participant.username,
          counter: 0
        }

        return db.collection('gay-game').doc(`${new Date().getTime()}`).set(participantData).then(() => {
          console.log('new participant added')

          message.reply(`${participant.username} welcome to gay bar`)
        });
      }
    });
}

async function gayAnnouncement() {
  let targetGuild = client.guilds.cache.get('660828078662090773');
  let voiceChannels = targetGuild.channels.cache.filter(ch => ch.type === 'GUILD_VOICE');
  let randomActiveVoiceChannels = voiceChannels.filter(channel => channel.members.size >= 1).random();
  let participants = [];
  if (randomActiveVoiceChannels) {
    db.collection('gay-game').get()
      .then(doc => {
        participants = doc.docs.map(doc => doc.data());
        docs = doc.docs;

        (async () => {
          try {
            const gayOfTheDay = participants[Math.floor(Math.random() * participants.length)];
            const gayOfTheDayData = docs.find(doc => doc.data().id === gayOfTheDay.id);
            const greetingOfTheDay = greeting[Math.floor(Math.random() * greeting.length)];

            const audioFileUrl = (
              await axios.get(
                `http://ec2-16-170-224-19.eu-north-1.compute.amazonaws.com:3000/speak`, {
                  params: {
                    text: `${greetingOfTheDay}, ${gayOfTheDay.username} пидор`
                  }
                }
              )
            ).data;
            const connection = await connectToChannel(randomActiveVoiceChannels);
            connection.subscribe(player);
            playSong(audioFileUrl)

            db.collection("gay-game").doc(gayOfTheDayData.id).update({
                counter: ++gayOfTheDay.counter
              })
              .then(function () {
                gayStatistics();
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
        console.log('Error', err);
        process.exit();
      })
  } else {
    const startTime = new Date(Date.now() + 5000);
    const endTime = new Date(startTime.getTime() + 1800000);
    const job = schedule.scheduleJob({
      start: startTime,
      end: endTime,
      rule: '* 5 * * * *'
    }, function () {
      let guild = client.guilds.cache.get('660828078662090773');
      let channels = guild.channels.cache.filter(ch => ch.type === 'GUILD_VOICE');
      let activeChannel = channels.filter(channel => channel.members.size >= 1).random();
      if (activeChannel) {
        console.log('gays here');
        job.cancel();
        gayAnnouncement();
      } else {
        console.log('no gays available');
      }

      if (this.nextInvocation() === null) {
        noGaysGayAnnouncement();
      }
    });
  }
}

function noGaysGayAnnouncement() {
  let channel = client.guilds.cache.get('660828078662090773').channels.cache.get('931268837586915349');
  let participants = [];

  db.collection('gay-game').get()
    .then(doc => {
      participants = doc.docs.map(doc => doc.data());
      docs = doc.docs;

      (async () => {
        try {
          const gayOfTheDay = participants[Math.floor(Math.random() * participants.length)];
          const gayOfTheDayData = docs.find(doc => doc.data().id === gayOfTheDay.id);

          db.collection("gay-game").doc(gayOfTheDayData.id).update({
              counter: ++gayOfTheDay.counter
            })
            .then(function () {
              channel.send(`No gays available ;( but gay of the day is ${gayOfTheDay.username}. CUMGRATULATIONS!`)
              gayStatistics();
              console.log("gay updated");
            });
        } catch (error) {
          console.error(error);
        }
      })();
    })
    .catch(err => {
      console.log('Error', err);
      process.exit();
    })
}

function gayStatistics(message = null) {
  let channel = client.guilds.cache.get('660828078662090773').channels.cache.get('931268837586915349');
  let participants = []
  db.collection('gay-game').get()
    .then(doc => {
        participants = doc.docs.map(doc => doc.data());
        let dungeonMaster = '';
        let biggestCountList = participants.filter(part => part.counter === Math.max.apply(Math, participants.map(function (p) {
          return p.counter;
        })));
        biggestCountList.map((master, index, row) => {
          if (index < 1) {
            dungeonMaster += `${master.username}`
          } else if (index + 1 === row.length) {
            dungeonMaster += ` і ${master.username}`
          } else {
            dungeonMaster += `, ${master.username}`
          }
        })

        const exampleEmbed = new MessageEmbed()
          .setColor('#00ffcc')
          .setTitle('Gay statistic')
          .setAuthor('Billy Herrington', 'https://cdn1.flamp.ru/bf30a0f028b9df436009080d4be10947.jpg')
          .setDescription(`Ну шо гейочкі, вот ваша статискика. Наш${biggestCountList.length > 1 ? 'і' : ''} dungeon master${biggestCountList.length > 1 ? '`s' : ''} це ${dungeonMaster}`)
      .setThumbnail('https://i1.sndcdn.com/artworks-000651764767-zbla7n-t500x500.jpg')
      .setImage('https://icdn.lenta.ru/images/2021/01/29/17/20210129175240891/pwa_list_rect_1024_236f156af569cdf9641dca36419bcbfc.jpg')
      .setTimestamp()

      participants.map((participant) => {
        exampleEmbed.addField(`${participant.username}`, `You are gay ${participant.counter} times`, false);
      })
    
      if (message) {
        message.reply({ embeds: [exampleEmbed] });
      } else {
        channel.send({ embeds: [exampleEmbed] })
      }
    })
    .catch(err => {
      console.log('Error', err);
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
    addParticipant(message.member.user, message);
  }
});

client.on('messageCreate', async (message) => {
  if (!message.content.startsWith(prefix)) return;

  const args = message.content.trim().split(/:+/g);
  const cmd = args[0].slice(prefix.length).toLowerCase();

  if (cmd === 'gaystats') {
    gayStatistics(message);
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
            `
            http: //ec2-16-170-224-19.eu-north-1.compute.amazonaws.com:3000/speak`,
            {
              params: {
                text: args[1]
              }
            }
          )
      ).data; playSong(audioFileUrl); message.reply('Playing now!');
    }
  catch (error) {
    console.error(error);
  }
} else {
  message.reply('Join a voice channel then try again!');
}
}
});

// Login to Discord with your client's token
client.login(process.env.token);