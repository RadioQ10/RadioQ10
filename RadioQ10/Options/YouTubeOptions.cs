namespace RadioQ10.Options;

public sealed class YouTubeOptions
{
    public const string SectionName = "YouTube";

    public string ApiKey { get; init; } = string.Empty;

    public int MaxResults { get; init; } = 10;
}

