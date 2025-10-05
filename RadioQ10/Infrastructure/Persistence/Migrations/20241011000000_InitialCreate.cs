using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RadioQ10.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "radio_users",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    IpAddress = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_radio_users", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "song_queue",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    VideoId = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    Title = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    ChannelTitle = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    ThumbnailUrl = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: true),
                    RequestedBy = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    RequestedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    EnqueuedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_song_queue", x => x.Id);
                    table.ForeignKey(
                        name: "FK_song_queue_radio_users_RequestedByUserId",
                        column: x => x.RequestedByUserId,
                        principalTable: "radio_users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_radio_users_IpAddress_Name",
                table: "radio_users",
                columns: new[] { "IpAddress", "Name" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_song_queue_RequestedByUserId",
                table: "song_queue",
                column: "RequestedByUserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "song_queue");

            migrationBuilder.DropTable(
                name: "radio_users");
        }
    }
}
