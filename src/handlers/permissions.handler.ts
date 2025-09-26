import {
	ChatInputCommandInteraction ,
	Message,
	PermissionResolvable,
	GuildMember,
	EmbedBuilder,
} from "discord.js";

export async function checkPermissions(
	source: ChatInputCommandInteraction | Message,
	requiredPerms: PermissionResolvable[]
): Promise<boolean> {
	const member = source instance of Message
		? source.member as GuildMember
		: (source.member as GuildMember);

	if (!member) return false;

	const missing = requiredPerms.filter((perm) => !member.permissions.has(perm));
	return missing.length === 0;
}

export async function sendNoPermission(
	source: ChatInputCommandInteraction | Message
) {
	const embed = new EmbedBuilder()
    	.setTitle('Permission Denied')
    	.setDescription('You do not have permission to use this command.')
    	.setColor('Red');

	if (source instanceof Message) {
    	await source.channel.send({ embeds: [embed] });
	} else if (source.isRepliable()) {
    	await source.reply({ embeds: [embed], ephemeral: true });
	}
}